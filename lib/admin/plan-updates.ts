import { FieldValue, type Firestore } from "firebase-admin/firestore"

export type AdminPlanUpdateValue = "free" | "pro"

export function normalizeAdminPlanReason(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

export function buildAdminPlanPatch(plan: AdminPlanUpdateValue, reason?: string | null) {
  if (plan === "pro") {
    return {
      plan: "pro" as const,
      monthlyDraftLimit: 999,
      entitlements: {
        planOverride: "pro" as const,
        reason: normalizeAdminPlanReason(reason) ?? "manual upgrade",
        expiresAt: null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }
  }

  return {
    plan: "free" as const,
    monthlyDraftLimit: 5,
    entitlements: {
      planOverride: FieldValue.delete(),
      reason: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
    },
    planOverride: FieldValue.delete(),
    reason: FieldValue.delete(),
    expiresAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

export async function applyAdminPlanUpdate(options: {
  firestore: Firestore
  targetUid: string
  plan: AdminPlanUpdateValue
  reason?: string | null
}) {
  const patch = buildAdminPlanPatch(options.plan, options.reason)
  await options.firestore.collection("users").doc(options.targetUid).set(patch, { merge: true })

  return {
    patch,
    appliedReason: options.plan === "pro" ? normalizeAdminPlanReason(options.reason) ?? "manual upgrade" : null,
  }
}
