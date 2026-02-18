import type { Firestore } from "firebase-admin/firestore"

import { buildUsageResponse, fetchUsageRecord, type MonthlyUsageRecord, type PlanType, type UsageOverview } from "./usage"
import { isInternalQaUid } from "@/lib/auth/internal-qa"
import { DRAFT_PRODUCT_KEY, getDraftEntitlement, type DraftEntitlement } from "./zid/client"

export interface UserEntitlements {
  plan: PlanType
  usageRecord: MonthlyUsageRecord
  usage: UsageOverview
  isProSubscriber: boolean
  entitlement: DraftEntitlement
}

export async function getUserEntitlements(
  uid: string,
  db: Firestore,
  options?: { authHeader?: string | null; requestId?: string },
): Promise<UserEntitlements> {
  const entitlement = await getDraftEntitlement({
    userId: uid,
    productKey: DRAFT_PRODUCT_KEY,
    authHeader: options?.authHeader,
    requestId: options?.requestId,
  })

  const plan: PlanType = entitlement.hasAccess ? "pro" : "free"
  const usageRecord = await fetchUsageRecord(uid, db)
  const usage = buildUsageResponse(usageRecord, plan, {
    // QA users keep unlimited usage without minting paid access
    unlimited: plan === "pro" || isInternalQaUid(uid),
  })

  return {
    plan,
    usageRecord,
    usage,
    isProSubscriber: entitlement.hasAccess,
    entitlement,
  }
}
