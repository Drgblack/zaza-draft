import type { Firestore } from "firebase-admin/firestore"

import { buildUsageResponse, fetchUsageRecord, type MonthlyUsageRecord, type PlanType, type UsageOverview } from "./usage"
import { isInternalQaUid } from "@/lib/auth/internal-qa"
import { isForcedProUser } from "@/lib/dev/forced-pro-users"
import { isProOrQa } from "./plan/is-pro-or-qa"

export interface UserEntitlements {
  plan: PlanType
  usageRecord: MonthlyUsageRecord
  usage: UsageOverview
  isProSubscriber: boolean
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "active_trial"])

function derivePlanFromUserDoc(docData: Record<string, unknown> | undefined): PlanType {
  if (!docData) {
    return "free"
  }

  if (docData?.accountType === "pro") {
    return "pro"
  }

  const subscriptionStatus = typeof docData?.subscriptionStatus === "string" ? docData.subscriptionStatus.toLowerCase() : ""
  if (subscriptionStatus && ACTIVE_STATUSES.has(subscriptionStatus)) {
    return "pro"
  }

  return "free"
}

interface EntitlementOverride {
  planOverride: "pro" | null
  schoolDomainOverride: string | null
  expiresAt: string | null
  reason: string | null
  updatedAt: string | null
}

interface SchoolLicenceRecord {
  domain: string
  plan: "pro"
  expiresAt?: string | null
  reason?: string | null
  createdAt: string
  updatedAt: string
}

const FAKE_PAST_DATE = new Date(0).toISOString()

function normalizeTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return null
  }
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return FAKE_PAST_DATE
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
  const trimmed = domain.trim().toLowerCase()
  return trimmed || null
}

function getEmailDomain(docData: Record<string, unknown> | undefined) {
  const rawEmail = typeof docData?.email === "string" ? docData.email : null
  if (!rawEmail) {
    return null
  }
  const parts = rawEmail.split("@")
  if (parts.length < 2) {
    return null
  }
  return normalizeDomain(parts[1])
}

function parseEntitlementOverride(data: Record<string, unknown> | undefined): EntitlementOverride {
  const entitlementData = data ?? {}
  return {
    planOverride: entitlementData?.planOverride === "pro" ? "pro" : null,
    schoolDomainOverride: normalizeDomain(
      typeof entitlementData?.schoolDomainOverride === "string" ? entitlementData.schoolDomainOverride : null,
    ),
    expiresAt: normalizeTimestamp(entitlementData?.expiresAt ?? null),
    reason: typeof entitlementData?.reason === "string" ? entitlementData.reason : null,
    updatedAt: typeof entitlementData?.updatedAt === "string" ? entitlementData.updatedAt : null,
  }
}

async function fetchSchoolLicence(
  domain: string,
  db: Firestore,
): Promise<SchoolLicenceRecord | null> {
  const snapshot = await db.collection("schoolLicences").doc(domain).get()
  if (!snapshot.exists) {
    return null
  }
  const data = snapshot.data()
  if (!data) {
    return null
  }
  if (data.plan !== "pro") {
    return null
  }
  const record: SchoolLicenceRecord = {
    domain,
    plan: "pro",
    expiresAt:
      typeof data.expiresAt === "string" ? normalizeTimestamp(data.expiresAt) : normalizeTimestamp(null),
    reason: typeof data.reason === "string" ? data.reason : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  }
  if (!isActiveUntil(record.expiresAt ?? null)) {
    return null
  }
  return record
}


export async function getUserEntitlements(uid: string, db: Firestore): Promise<UserEntitlements> {
  const forcedProUser = isForcedProUser(uid)
  const userRef = db.collection("users").doc(uid)
  const snapshot = await userRef.get()
  const docData = snapshot.data()
  const basePlan = derivePlanFromUserDoc(docData)
  const entitlementsOverride = parseEntitlementOverride(docData?.entitlements as Record<string, unknown> | undefined)
  const planOverrideActive =
    entitlementsOverride.planOverride === "pro" && isActiveUntil(entitlementsOverride.expiresAt)
  const domainCandidates = new Set<string>()
  if (entitlementsOverride.schoolDomainOverride) {
    domainCandidates.add(entitlementsOverride.schoolDomainOverride)
  }
  const emailDomain = getEmailDomain(docData)
  if (emailDomain) {
    domainCandidates.add(emailDomain)
  }
  const licenceRecords =
    domainCandidates.size > 0
      ? await Promise.all(
          Array.from(domainCandidates).map((domain) => fetchSchoolLicence(domain, db)),
        ).then((records) => records.filter(Boolean) as SchoolLicenceRecord[])
      : []
  const hasDomainLicence = licenceRecords.length > 0
  const subscriptionPlan = isProOrQa(basePlan, uid) ? "pro" : "free"
  const plan: PlanType =
    forcedProUser || planOverrideActive || hasDomainLicence ? "pro" : subscriptionPlan
  const usageRecord = await fetchUsageRecord(uid, db)
  const usage = buildUsageResponse(usageRecord, plan, {
    unlimited: isInternalQaUid(uid) || plan === "pro",
  })
  const isProSubscriber = forcedProUser || basePlan === "pro"

  return {
    plan,
    usageRecord,
    usage,
    isProSubscriber,
  }
}
