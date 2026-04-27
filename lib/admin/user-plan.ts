import { isForcedProUser } from "@/lib/dev/forced-pro-users"

export type AdminPlanValue = "free" | "pro"
export type AdminPlanSource =
  | "manual_override"
  | "school_domain_licence"
  | "subscription"
  | "development_override"
  | "free_fallback"

export type SchoolLicenceRecord = {
  domain: string
  plan: "pro"
  expiresAt: string | null
  reason: string | null
}

export type ResolvedAdminUserPlan = {
  plan: AdminPlanValue
  effectivePlan: AdminPlanValue
  planReason: string | null
  planSource: AdminPlanSource
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "active_trial",
])

function normalizeTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return null
  }

  return new Date(parsed).toISOString()
}

function isActiveUntil(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return true
  }

  const parsed = Date.parse(expiresAt)
  if (Number.isNaN(parsed)) {
    return false
  }

  return parsed > Date.now()
}

function normalizeDomain(domain?: string | null) {
  if (!domain) {
    return null
  }

  const normalized = domain.trim().toLowerCase()
  return normalized || null
}

function parseEntitlements(raw: unknown) {
  const entitlements =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : undefined

  return {
    planOverride: entitlements?.planOverride === "pro" ? "pro" : null,
    schoolDomainOverride: normalizeDomain(
      typeof entitlements?.schoolDomainOverride === "string"
        ? entitlements.schoolDomainOverride
        : null,
    ),
    expiresAt: normalizeTimestamp(entitlements?.expiresAt ?? null),
    reason: typeof entitlements?.reason === "string" ? entitlements.reason.trim() || null : null,
  }
}

function deriveStoredPlan(userData: Record<string, unknown> | undefined): AdminPlanValue {
  if (!userData) {
    return "free"
  }

  if (userData.plan === "pro") {
    return "pro"
  }

  if (userData.accountType === "pro") {
    return "pro"
  }

  const subscriptionStatus =
    typeof userData.subscriptionStatus === "string"
      ? userData.subscriptionStatus.trim().toLowerCase()
      : ""

  if (subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return "pro"
  }

  return "free"
}

function getEmailDomain(userData: Record<string, unknown> | undefined) {
  const rawEmail = typeof userData?.email === "string" ? userData.email : null
  if (!rawEmail) {
    return null
  }

  const parts = rawEmail.split("@")
  if (parts.length < 2) {
    return null
  }

  return normalizeDomain(parts[1])
}

export function resolveAdminUserPlan(options: {
  uid?: string | null
  userData?: Record<string, unknown>
  schoolLicencesByDomain?: Map<string, SchoolLicenceRecord>
}): ResolvedAdminUserPlan {
  const { uid, userData, schoolLicencesByDomain } = options
  const storedPlan = deriveStoredPlan(userData)
  const entitlements = parseEntitlements(userData?.entitlements)
  const planOverrideActive =
    entitlements.planOverride === "pro" && isActiveUntil(entitlements.expiresAt)

  const candidateDomains = new Set<string>()
  if (entitlements.schoolDomainOverride) {
    candidateDomains.add(entitlements.schoolDomainOverride)
  }

  const emailDomain = getEmailDomain(userData)
  if (emailDomain) {
    candidateDomains.add(emailDomain)
  }

  const matchingSchoolLicence =
    schoolLicencesByDomain && candidateDomains.size > 0
      ? Array.from(candidateDomains)
          .map((domain) => schoolLicencesByDomain.get(domain))
          .find(Boolean) ?? null
      : null

  if (isForcedProUser(uid)) {
    return {
      plan: storedPlan,
      effectivePlan: "pro",
      planReason: entitlements.reason,
      planSource: "development_override",
    }
  }

  if (planOverrideActive) {
    return {
      plan: storedPlan,
      effectivePlan: "pro",
      planReason: entitlements.reason ?? "manual upgrade",
      planSource: "manual_override",
    }
  }

  if (matchingSchoolLicence) {
    return {
      plan: storedPlan,
      effectivePlan: "pro",
      planReason: matchingSchoolLicence.reason,
      planSource: "school_domain_licence",
    }
  }

  if (storedPlan === "pro") {
    return {
      plan: "pro",
      effectivePlan: "pro",
      planReason: entitlements.reason,
      planSource: "subscription",
    }
  }

  return {
    plan: "free",
    effectivePlan: "free",
    planReason: null,
    planSource: "free_fallback",
  }
}

export function buildSchoolLicencesByDomain(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
) {
  const licences = new Map<string, SchoolLicenceRecord>()

  for (const doc of docs) {
    const data = doc.data()
    if (data.plan !== "pro") {
      continue
    }

    const domain = normalizeDomain(typeof data.domain === "string" ? data.domain : doc.id)
    if (!domain) {
      continue
    }

    const expiresAt =
      typeof data.expiresAt === "string" ? normalizeTimestamp(data.expiresAt) : null
    if (!isActiveUntil(expiresAt)) {
      continue
    }

    licences.set(domain, {
      domain,
      plan: "pro",
      expiresAt,
      reason: typeof data.reason === "string" ? data.reason.trim() || null : null,
    })
  }

  return licences
}
