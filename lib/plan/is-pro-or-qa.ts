import type { PlanType } from "@/lib/usage"

import { isInternalQaUid } from "@/lib/auth/internal-qa"

export function isProOrQa(plan: PlanType, uid?: string) {
  if (plan === "pro") {
    return true
  }
  if (!uid) {
    return false
  }
  return isInternalQaUid(uid)
}
