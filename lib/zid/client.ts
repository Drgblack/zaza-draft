import { randomUUID } from "crypto"
import { z } from "zod"

export const DRAFT_PRODUCT_KEY = "draft"

const DEFAULT_TTL_MS = 60_000
const SHORT_TTL_MS = 15_000
const NEAR_EXPIRY_WINDOW_MS = 10 * 60 * 1000

const entitlementSchema = z.object({
  ok: z.boolean().optional(),
  hasAccess: z.boolean(),
  accessType: z.string().optional(),
  source: z.string().optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
  reason: z.string().optional(),
})

export type DraftEntitlement = z.infer<typeof entitlementSchema> & {
  checkedAt: string
}

type CacheEntry = {
  value: DraftEntitlement
  expiresAtMs: number
}

const cache = new Map<string, CacheEntry>()

function nowMs() {
  return Date.now()
}

function normalizeExpiry(raw: string | null | undefined): string | null | "invalid" {
  if (raw === null || raw === undefined) {
    return null
  }
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) {
    return "invalid"
  }
  return new Date(parsed).toISOString()
}

function cacheKey(userId: string, productKey: string) {
  return `${userId}:${productKey}`
}

export function __resetDraftEntitlementCache() {
  cache.clear()
}

export async function getDraftEntitlement(input: {
  userId: string
  productKey?: string
  authHeader?: string | null
  requestId?: string
}): Promise<DraftEntitlement> {
  if (typeof window !== "undefined") {
    throw new Error("getDraftEntitlement must be called on the server.")
  }

  const { userId, requestId, authHeader } = input
  const productKey = input.productKey ?? DRAFT_PRODUCT_KEY
  const checkedAt = new Date().toISOString()
  const cacheId = cacheKey(userId, productKey)
  const cached = cache.get(cacheId)
  const now = nowMs()
  if (cached && cached.expiresAtMs > now) {
    return cached.value
  }

  const baseUrl = process.env.ZID_BASE_URL?.trim()
  if (!baseUrl) {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: "missing_base_url",
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  const bearerToken = authHeader?.trim()
    || (process.env.ZID_SERVICE_BEARER_TOKEN ? `Bearer ${process.env.ZID_SERVICE_BEARER_TOKEN}` : null)

  if (!bearerToken) {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: "missing_authorization",
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/api/entitlements/resolve-self?productKey=${encodeURIComponent(productKey)}`
  const correlationId = requestId || randomUUID()

  let response
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: bearerToken,
        "x-request-id": correlationId,
      },
    })
  } catch (error) {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: "fetch_error",
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  if (!response.ok) {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: `http_${response.status}`,
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: "invalid_json",
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  const validation = entitlementSchema.safeParse(parsed)
  if (!validation.success) {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: "invalid_response",
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  const normalizedExpiry = normalizeExpiry(validation.data.expiresAt ?? null)
  if (normalizedExpiry === "invalid") {
    const deny: DraftEntitlement = {
      hasAccess: false,
      reason: "invalid_expires_at",
      checkedAt,
    }
    cache.set(cacheId, { value: deny, expiresAtMs: now + DEFAULT_TTL_MS })
    return deny
  }

  const expiresAtIso = normalizedExpiry
  const baseEntitlement: DraftEntitlement = {
    hasAccess: validation.data.hasAccess === true,
    accessType: validation.data.accessType,
    source: validation.data.source,
    expiresAt: expiresAtIso ?? null,
    reason: validation.data.reason,
    checkedAt,
  }

  let ttlMs = DEFAULT_TTL_MS
  if (expiresAtIso) {
    const expiryMs = Date.parse(expiresAtIso)
    if (expiryMs <= now) {
      const deny: DraftEntitlement = {
        ...baseEntitlement,
        hasAccess: false,
        reason: "expired",
      }
      cache.set(cacheId, { value: deny, expiresAtMs: now + SHORT_TTL_MS })
      return deny
    }
    if (expiryMs - now <= NEAR_EXPIRY_WINDOW_MS) {
      ttlMs = SHORT_TTL_MS
    }
  }

  cache.set(cacheId, { value: baseEntitlement, expiresAtMs: now + ttlMs })
  return baseEntitlement
}
