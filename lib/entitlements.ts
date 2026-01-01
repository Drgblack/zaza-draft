import type { Firestore } from "firebase-admin/firestore"

import { buildUsageResponse, fetchUsageRecord, type MonthlyUsageRecord, type PlanType } from "./usage"
import { isProOrQa } from "./plan/is-pro-or-qa"

export interface UserEntitlements {
  plan: PlanType
  usageRecord: MonthlyUsageRecord
  usage: ReturnType<typeof buildUsageResponse>
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

export async function getUserEntitlements(uid: string, db: Firestore): Promise<UserEntitlements> {
  const userRef = db.collection("users").doc(uid)
  const snapshot = await userRef.get()
  const docData = snapshot.data()
  const basePlan = derivePlanFromUserDoc(docData)
  const plan: PlanType = isProOrQa(basePlan, uid) ? "pro" : "free"
  const usageRecord = await fetchUsageRecord(uid, db)
  const usage = buildUsageResponse(usageRecord, plan)

  return {
    plan,
    usageRecord,
    usage,
  }
}
