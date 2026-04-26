export type ZazaRole =
  | "super_admin"
  | "admin"
  | "school_admin"
  | "teacher"
  | "teacher_free"

export type ZazaPlanStatus = "active" | "trialing" | "free" | "cancelled"

export interface ZazaUserProfile {
  uid: string
  uidHash: string
  role: ZazaRole
  email: string
  schoolId?: string
  createdAt: number
  updatedAt: number
  stripeCustomerId?: string
  planStatus: ZazaPlanStatus
}

export function hasAdminAccess(role: ZazaRole): boolean {
  return role === "super_admin" || role === "admin"
}

export function hasSchoolAdminAccess(role: ZazaRole): boolean {
  return role === "super_admin" || role === "admin" || role === "school_admin"
}

export function hasFullDraftAccess(role: ZazaRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "school_admin" ||
    role === "teacher"
  )
}

export function canAssignRoles(role: ZazaRole): boolean {
  return role === "super_admin"
}

export function isManuallyManagedRole(role: ZazaRole): boolean {
  return role === "super_admin" || role === "admin" || role === "school_admin"
}

export function createDefaultUserProfile(options: {
  uid: string
  uidHash: string
  email: string
  schoolId?: string
  stripeCustomerId?: string
  now?: number
}): ZazaUserProfile {
  const timestamp = options.now ?? Date.now()

  return {
    uid: options.uid,
    uidHash: options.uidHash,
    role: "teacher_free",
    email: options.email,
    schoolId: options.schoolId,
    createdAt: timestamp,
    updatedAt: timestamp,
    stripeCustomerId: options.stripeCustomerId,
    planStatus: "free",
  }
}

export function resolveRoleForPlanStatus(
  currentRole: ZazaRole,
  planStatus: ZazaPlanStatus,
): ZazaRole {
  if (isManuallyManagedRole(currentRole)) {
    return currentRole
  }

  if (planStatus === "active" || planStatus === "trialing") {
    return "teacher"
  }

  return "teacher_free"
}

export function buildBillingProfilePatch(options: {
  currentRole: ZazaRole
  planStatus: ZazaPlanStatus
  stripeCustomerId?: string | null
  now?: number
}) {
  const updatedAt = options.now ?? Date.now()

  return {
    role: resolveRoleForPlanStatus(options.currentRole, options.planStatus),
    planStatus: options.planStatus,
    stripeCustomerId: options.stripeCustomerId ?? undefined,
    updatedAt,
  }
}
