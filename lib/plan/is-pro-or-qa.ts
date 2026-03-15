import type { PlanType } from "@/lib/usage"

import { isInternalQaUid } from "@/lib/auth/internal-qa"
import { isForcedProUser } from "@/lib/dev/forced-pro-users"

export function isProOrQa(plan: PlanType, uid?: string) {
  if (plan === "pro") {
    return true
  }
  if (isForcedProUser(uid)) {
    return true
  }
  if (!uid) {
    return false
  }
  return isInternalQaUid(uid)
}
