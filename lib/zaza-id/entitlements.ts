import { isEntitlementExpired, parseDraftEntitlement, type DraftEntitlement } from "@/lib/zaza-id/types"

const DEFAULT_TIMEOUT_MS = 4000

export type DraftEntitlementStatus = "active" | "expired" | "revoked" | "trial" | "none"

export interface ResolvedDraftEntitlement extends DraftEntitlement {
  status: DraftEntitlementStatus
  orgId: string | null
}

type ZazaIdErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "upstream_5xx"
  | "timeout"
  | "network"
  | "misconfigured"
  | "invalid_response"
  | "unexpected"

interface ZazaIdErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export class ZazaIdEntitlementError extends Error {
  constructor(
    message: string,
    public code: ZazaIdErrorCode,
    public statusCode: number | null,
    public retryable: boolean,
    public payload: ZazaIdErrorPayload | null = null,
  ) {
    super(message)
    this.name = "ZazaIdEntitlementError"
  }
}

function getBaseUrl() {
  const baseUrl = process.env.ZAZA_ID_BASE_URL
  if (!baseUrl) {
    throw new ZazaIdEntitlementError(
      "Missing ZAZA_ID_BASE_URL environment variable",
      "misconfigured",
      null,
      true,
    )
  }
  return baseUrl.replace(/\/+$/, "")
}

async function parseErrorPayload(response: Response): Promise<ZazaIdErrorPayload | null> {
  try {
    return (await response.json()) as ZazaIdErrorPayload
  } catch {
    return null
  }
}

function deriveStatus(entitlement: DraftEntitlement): DraftEntitlementStatus {
  if (isEntitlementExpired(entitlement.expiresAt)) {
    return "expired"
  }
  if (!entitlement.hasAccess) {
    return entitlement.accessType === "none" ? "none" : "revoked"
  }
  if (entitlement.accessType === "trial") {
    return "trial"
  }
  return "active"
}

function normalizeEntitlement(entitlement: DraftEntitlement): ResolvedDraftEntitlement {
  const expiresAt = entitlement.expiresAt ? new Date(entitlement.expiresAt).toISOString() : null
  const status = deriveStatus(entitlement)
  return {
    ...entitlement,
    expiresAt,
    hasAccess: entitlement.hasAccess && status !== "expired",
    status,
    orgId: entitlement.sourceOrgId,
  }
}

function createResponseError(response: Response, payload: ZazaIdErrorPayload | null) {
  const message = payload?.error?.message || `Zaza ID entitlement request failed with status ${response.status}`
  if (response.status === 400) {
    return new ZazaIdEntitlementError(message, "bad_request", 400, false, payload)
  }
  if (response.status === 401) {
    return new ZazaIdEntitlementError(message, "unauthorized", 401, false, payload)
  }
  if (response.status === 403) {
    return new ZazaIdEntitlementError(message, "forbidden", 403, false, payload)
  }
  if (response.status >= 500) {
    return new ZazaIdEntitlementError(message, "upstream_5xx", response.status, true, payload)
  }
  return new ZazaIdEntitlementError(message, "unexpected", response.status, false, payload)
}

export function isRetryableZazaIdEntitlementError(error: unknown) {
  return error instanceof ZazaIdEntitlementError && error.retryable
}

interface FetchZazaIdEntitlementOptions {
  idToken: string
  productKey?: string
  timeoutMs?: number
}

export async function fetchZazaIdEntitlement({
  idToken,
  productKey = "draft",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: FetchZazaIdEntitlementOptions): Promise<ResolvedDraftEntitlement> {
  if (!idToken) {
    throw new ZazaIdEntitlementError("Missing Firebase ID token", "unauthorized", 401, false)
  }

  const endpoint = `${getBaseUrl()}/api/entitlements?productKey=${encodeURIComponent(productKey)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await parseErrorPayload(response)
      throw createResponseError(response, payload)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ZazaIdEntitlementError("Invalid JSON payload from Zaza ID", "invalid_response", response.status, false)
    }

    const entitlement = parseDraftEntitlement(payload)
    return normalizeEntitlement(entitlement)
  } catch (error) {
    if (error instanceof ZazaIdEntitlementError) {
      throw error
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ZazaIdEntitlementError("Zaza ID entitlement request timed out", "timeout", null, true)
    }
    if (error instanceof Error) {
      throw new ZazaIdEntitlementError(error.message, "network", null, true)
    }
    throw new ZazaIdEntitlementError("Unexpected entitlement request failure", "unexpected", null, true)
  } finally {
    clearTimeout(timeout)
  }
}
