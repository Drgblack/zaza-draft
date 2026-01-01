import type { Firestore } from "firebase-admin/firestore"

export interface MonthlyUsageRecord {
  month: string
  generationCount: number
  lastReset: string
}

export type PlanType = "free" | "pro"

const FREE_TIER_LIMIT = 10

export function getCurrentMonthKey() {
  const now = new Date()
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0")
  return `${now.getUTCFullYear()}-${month}`
}

export async function fetchUsageRecord(uid: string, db: Firestore) {
  const docRef = db.collection("users").doc(uid)
  const snapshot = await docRef.get()
  const stored: MonthlyUsageRecord | undefined = snapshot.data()?.monthlyUsage

  const defaultRecord: MonthlyUsageRecord = {
    month: getCurrentMonthKey(),
    generationCount: 0,
    lastReset: new Date().toISOString(),
  }

  if (!stored || stored.month !== defaultRecord.month) {
    return defaultRecord
  }

  return {
    month: stored.month,
    generationCount: stored.generationCount ?? 0,
    lastReset: stored.lastReset ?? defaultRecord.lastReset,
  }
}

export async function incrementUsage(uid: string, db: Firestore, allowUnlimited = false) {
  const userRef = db.collection("users").doc(uid)
  return db.runTransaction<MonthlyUsageRecord>(async (tx) => {
    const snapshot = await tx.get(userRef)
    const stored: MonthlyUsageRecord | undefined = snapshot.data()?.monthlyUsage
    const currentMonth = getCurrentMonthKey()

    let usage: MonthlyUsageRecord = {
      month: currentMonth,
      generationCount: 0,
      lastReset: new Date().toISOString(),
    }

    if (stored && stored.month === currentMonth) {
      usage = {
        month: stored.month,
        generationCount: stored.generationCount ?? 0,
        lastReset: stored.lastReset ?? usage.lastReset,
      }
    }

    if (!allowUnlimited && usage.generationCount >= FREE_TIER_LIMIT) {
      throw new Error("USAGE_LIMIT_EXCEEDED")
    }

    const updated: MonthlyUsageRecord = {
      ...usage,
      generationCount: usage.generationCount + 1,
    }

    tx.set(userRef, { monthlyUsage: updated }, { merge: true })
    return updated
  })
}

export interface UsageOverview {
  plan: PlanType
  currentMonthUsage: number
  limit: number | null
  remaining: number | null
  unlimited: boolean
}

export function buildUsageResponse(
  record: MonthlyUsageRecord,
  plan: PlanType,
  options?: { unlimited?: boolean },
): UsageOverview {
  const unlimited = options?.unlimited ?? plan === "pro"

  if (unlimited) {
    return {
      plan,
      currentMonthUsage: record.generationCount,
      limit: null,
      remaining: null,
      unlimited: true,
    }
  }

  return {
    plan,
    currentMonthUsage: record.generationCount,
    limit: FREE_TIER_LIMIT,
    remaining: Math.max(FREE_TIER_LIMIT - record.generationCount, 0),
    unlimited: false,
  }
}
