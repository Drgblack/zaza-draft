export type DraftAccessType = "trial" | "paid" | "comp" | "partner" | "none"
export type DraftAccessSource = "direct" | "org" | "domain" | "none"

export interface DraftEntitlement {
  userId: string
  productKey: "draft"
  hasAccess: boolean
  accessType: DraftAccessType
  expiresAt: string | null
  source: DraftAccessSource
  sourceOrgId: string | null
  licenceId: string | null
}

const ACCESS_TYPES = new Set<DraftAccessType>(["trial", "paid", "comp", "partner", "none"])
const ACCESS_SOURCES = new Set<DraftAccessSource>(["direct", "org", "domain", "none"])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNullableString(value: unknown, fieldName: string) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  throw new Error(`Invalid entitlement payload: ${fieldName} must be a string or null`)
}

export function parseDraftEntitlement(payload: unknown): DraftEntitlement {
  if (!isObject(payload)) {
    throw new Error("Invalid entitlement payload: expected an object")
  }

  if (typeof payload.userId !== "string" || payload.userId.trim().length === 0) {
    throw new Error("Invalid entitlement payload: userId is required")
  }
  if (payload.productKey !== "draft") {
    throw new Error("Invalid entitlement payload: productKey must be 'draft'")
  }
  if (typeof payload.hasAccess !== "boolean") {
    throw new Error("Invalid entitlement payload: hasAccess must be a boolean")
  }
  if (typeof payload.accessType !== "string" || !ACCESS_TYPES.has(payload.accessType as DraftAccessType)) {
    throw new Error("Invalid entitlement payload: accessType is invalid")
  }
  if (typeof payload.source !== "string" || !ACCESS_SOURCES.has(payload.source as DraftAccessSource)) {
    throw new Error("Invalid entitlement payload: source is invalid")
  }

  const expiresAt = asNullableString(payload.expiresAt, "expiresAt")
  if (expiresAt) {
    const timestamp = Date.parse(expiresAt)
    if (Number.isNaN(timestamp)) {
      throw new Error("Invalid entitlement payload: expiresAt must be ISO-8601 or null")
    }
  }

  return {
    userId: payload.userId,
    productKey: "draft",
    hasAccess: payload.hasAccess,
    accessType: payload.accessType as DraftAccessType,
    expiresAt,
    source: payload.source as DraftAccessSource,
    sourceOrgId: asNullableString(payload.sourceOrgId, "sourceOrgId"),
    licenceId: asNullableString(payload.licenceId, "licenceId"),
  }
}

export function isEntitlementExpired(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt) {
    return false
  }
  const timestamp = Date.parse(expiresAt)
  if (Number.isNaN(timestamp)) {
    return true
  }
  return timestamp <= now
}

export function hasDraftAccess(entitlement: DraftEntitlement, now = Date.now()) {
  return entitlement.hasAccess && !isEntitlementExpired(entitlement.expiresAt, now)
}
