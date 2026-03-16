import { createHash } from "crypto"

const DEFAULT_ANALYTICS_HASH_SALT = "zaza-draft-analytics"

function getAnalyticsHashSalt() {
  const configuredSalt =
    process.env.ANALYTICS_HASH_SALT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (configuredSalt) {
    return configuredSalt
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing ANALYTICS_HASH_SALT for production analytics hashing.")
  }

  return DEFAULT_ANALYTICS_HASH_SALT
}

function hashAnalyticsValue(namespace: "teacher" | "school", value: string) {
  return createHash("sha256")
    .update(`${getAnalyticsHashSalt()}:${namespace}:${value}`)
    .digest("hex")
}

export function normalizeAnalyticsDomain(domain?: string | null) {
  if (!domain) {
    return null
  }

  const trimmed = domain.trim().toLowerCase()
  if (!trimmed) {
    return null
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "").replace(/^mailto:/, "")
  const emailDomain = withoutProtocol.includes("@")
    ? withoutProtocol.split("@").at(-1) ?? ""
    : withoutProtocol
  const host = emailDomain.split("/")[0]?.split(":")[0]?.replace(/^\.+|\.+$/g, "") ?? ""

  return host || null
}

export function extractEmailDomain(email?: string | null) {
  if (!email) {
    return null
  }

  return normalizeAnalyticsDomain(email)
}

export function buildTeacherHash(uid: string) {
  return hashAnalyticsValue("teacher", uid)
}

export function buildSchoolHash(domain: string) {
  return hashAnalyticsValue("school", normalizeAnalyticsDomain(domain) ?? domain)
}

export function resolveSchoolDomain(options: {
  schoolDomainOverride?: string | null
  decodedEmail?: string | null
  userEmail?: string | null
}) {
  return (
    normalizeAnalyticsDomain(options.schoolDomainOverride) ??
    extractEmailDomain(options.decodedEmail) ??
    extractEmailDomain(options.userEmail)
  )
}

export function resolveAnalyticsHashes(options: {
  uid: string
  schoolDomainOverride?: string | null
  decodedEmail?: string | null
  userEmail?: string | null
}) {
  const schoolDomain = resolveSchoolDomain(options)

  return {
    teacher_hash: buildTeacherHash(options.uid),
    school_hash: schoolDomain ? buildSchoolHash(schoolDomain) : null,
  }
}
