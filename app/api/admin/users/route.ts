import { NextResponse } from "next/server"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles, type ZazaRole } from "@/lib/auth/roles"
import {
  buildSchoolLicencesByDomain,
  resolveAdminUserPlan,
  type AdminPlanSource,
} from "@/lib/admin/user-plan"
import type { LicenceRecord, SchoolMembershipRecord, SchoolRecord } from "@/lib/admin/licences"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

type AdminUserRecord = {
  uid: string
  email: string
  role: ZazaRole
  plan: string
  effectivePlan: string
  planStatus: string
  planReason: string | null
  proReason: string | null
  planSource: AdminPlanSource
  schoolId: string | null
  schoolName: string | null
  licenceId: string | null
  licenceStatus: string | null
  createdAt: number
  updatedAt: number
}

type SortOption = "created_desc" | "created_asc" | "email_asc" | "email_desc"

const VALID_ROLES = new Set<ZazaRole>([
  "super_admin",
  "admin",
  "school_admin",
  "teacher",
  "teacher_free",
])

function toTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis()
  }

  return 0
}

function normaliseRole(value: unknown): ZazaRole {
  return VALID_ROLES.has(value as ZazaRole) ? (value as ZazaRole) : "teacher_free"
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }
  return Math.min(parsed, max)
}

function normaliseSort(value: string | null): SortOption {
  if (
    value === "created_desc" ||
    value === "created_asc" ||
    value === "email_asc" ||
    value === "email_desc"
  ) {
    return value
  }

  return "created_desc"
}

function normaliseRoleFilter(value: string | null) {
  return VALID_ROLES.has(value as ZazaRole) ? (value as ZazaRole) : ""
}

function normalisePlanFilter(value: string | null) {
  return value === "free" || value === "pro" ? value : ""
}

function mergeAdminUser(
  source: Partial<AdminUserRecord> & Pick<AdminUserRecord, "uid">,
  existing?: AdminUserRecord,
): AdminUserRecord {
  return {
    uid: source.uid,
    email: source.email ?? existing?.email ?? "",
    role: source.role ?? existing?.role ?? "teacher_free",
    plan: source.plan ?? existing?.plan ?? "free",
    effectivePlan:
      source.effectivePlan ?? existing?.effectivePlan ?? source.plan ?? existing?.plan ?? "free",
    planStatus: source.planStatus ?? existing?.planStatus ?? "free",
    planReason: source.planReason ?? existing?.planReason ?? null,
    proReason: source.proReason ?? existing?.proReason ?? source.planReason ?? existing?.planReason ?? null,
    planSource: source.planSource ?? existing?.planSource ?? "free_fallback",
    schoolId: source.schoolId ?? existing?.schoolId ?? null,
    schoolName: source.schoolName ?? existing?.schoolName ?? null,
    licenceId: source.licenceId ?? existing?.licenceId ?? null,
    licenceStatus: source.licenceStatus ?? existing?.licenceStatus ?? null,
    createdAt: source.createdAt ?? existing?.createdAt ?? 0,
    updatedAt: source.updatedAt ?? existing?.updatedAt ?? 0,
  }
}

function sortUsers(users: AdminUserRecord[], sort: SortOption) {
  const collator = new Intl.Collator("en", { sensitivity: "base" })

  return [...users].sort((left, right) => {
    switch (sort) {
      case "created_asc":
        return left.createdAt - right.createdAt || collator.compare(left.email, right.email)
      case "email_asc":
        return collator.compare(left.email, right.email) || (right.createdAt - left.createdAt)
      case "email_desc":
        return collator.compare(right.email, left.email) || (right.createdAt - left.createdAt)
      case "created_desc":
      default:
        return right.createdAt - left.createdAt || collator.compare(left.email, right.email)
    }
  })
}

export async function GET(request: Request) {
  try {
    assertZazaDraftProject({ context: "GET /api/admin/users" })

    const authContext = await authorizeFirebaseRequest(request)
    const { auth, firestore } = authContext
    if (!firestore) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FIRESTORE_UNAVAILABLE", message: "Firestore unavailable." },
        },
        { status: 500 },
      )
    }

    const requesterProfile = await getUserProfile(authContext.uid, firestore)
    const requesterRole = requesterProfile?.role ?? "teacher_free"
    if (!canAssignRoles(requesterRole)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SUPER_ADMIN_REQUIRED", message: "Super admin access required." },
        },
        { status: 403 },
      )
    }

    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? ""
    const roleFilter = normaliseRoleFilter(url.searchParams.get("role"))
    const planFilter = normalisePlanFilter(url.searchParams.get("plan"))
    const sort = normaliseSort(url.searchParams.get("sort"))
    const page = parsePositiveInt(url.searchParams.get("page"), 1, 10_000)
    const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 25, 100)

    const [profileSnapshot, userSnapshot, schoolLicenceSnapshot, licencesSnapshot, schoolsSnapshot, membershipsSnapshot, authUserPages] = await Promise.all([
      firestore.collection("user_profiles").get(),
      firestore.collection("users").get(),
      firestore.collection("schoolLicences").get(),
      firestore.collection("licences").get(),
      firestore.collection("schools").get(),
      firestore.collection("school_memberships").get(),
      (async () => {
        if (!auth) {
          return []
        }

        const users: Array<{ uid: string; email: string; createdAt: number }> = []
        let nextPageToken: string | undefined

        do {
          const pageResult = await auth.listUsers(1000, nextPageToken)
          users.push(
            ...pageResult.users.map((user) => ({
              uid: user.uid,
              email: user.email ?? "",
              createdAt: user.metadata.creationTime ? Date.parse(user.metadata.creationTime) || 0 : 0,
            })),
          )
          nextPageToken = pageResult.pageToken
        } while (nextPageToken)

        return users
      })(),
    ])

    const schoolLicencesByDomain = buildSchoolLicencesByDomain(
      schoolLicenceSnapshot.docs as Array<{ id: string; data: () => Record<string, unknown> }>,
    )
    const licencesById = new Map<string, LicenceRecord>()
    for (const doc of licencesSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      licencesById.set(doc.id, {
        schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
        licenceType: data.licenceType === "district" ? "district" : "school",
        seatLimit: typeof data.seatLimit === "number" ? data.seatLimit : 0,
        seatsUsed: typeof data.seatsUsed === "number" ? data.seatsUsed : 0,
        status:
          data.status === "active" || data.status === "expired" || data.status === "cancelled"
            ? data.status
            : "trial",
        startDate: toTimestamp(data.startDate),
        endDate: toTimestamp(data.endDate),
        createdAt: toTimestamp(data.createdAt),
        updatedAt: toTimestamp(data.updatedAt),
      })
    }
    const schoolsById = new Map<string, SchoolRecord>()
    for (const doc of schoolsSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      schoolsById.set(doc.id, {
        schoolName: typeof data.schoolName === "string" ? data.schoolName : "",
        contactEmail: typeof data.contactEmail === "string" ? data.contactEmail : "",
        domains: Array.isArray(data.domains) ? data.domains.filter((value) => typeof value === "string") as string[] : [],
        licenceType: data.licenceType === "district" ? "district" : "school",
        seatLimit: typeof data.seatLimit === "number" ? data.seatLimit : 0,
        seatsUsed: typeof data.seatsUsed === "number" ? data.seatsUsed : 0,
        status:
          data.status === "active" || data.status === "expired" || data.status === "cancelled"
            ? data.status
            : "trial",
        startDate: toTimestamp(data.startDate),
        endDate: toTimestamp(data.endDate),
        notes: typeof data.notes === "string" ? data.notes : "",
        createdAt: toTimestamp(data.createdAt),
        updatedAt: toTimestamp(data.updatedAt),
        createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
      })
    }
    const membershipsByUid = new Map<string, SchoolMembershipRecord>()
    for (const doc of membershipsSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      membershipsByUid.set(doc.id, {
        schoolId: typeof data.schoolId === "string" ? data.schoolId : "",
        licenceId: typeof data.licenceId === "string" ? data.licenceId : "",
        assignedAt: toTimestamp(data.assignedAt),
        assignedBy: typeof data.assignedBy === "string" ? data.assignedBy : "",
        status: data.status === "removed" ? "removed" : "active",
      })
    }

    const userMap = new Map<string, AdminUserRecord>()

    for (const doc of profileSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      const profileSchoolId = typeof data.schoolId === "string" ? data.schoolId : null
      const profileLicenceId = typeof data.licenceId === "string" ? data.licenceId : null
      userMap.set(
        doc.id,
        mergeAdminUser(
          {
            uid: doc.id,
            email: typeof data.email === "string" ? data.email : "",
            role: normaliseRole(data.role),
            planStatus: typeof data.planStatus === "string" ? data.planStatus : "free",
            schoolId: profileSchoolId,
            schoolName: profileSchoolId ? schoolsById.get(profileSchoolId)?.schoolName ?? null : null,
            licenceId: profileLicenceId,
            licenceStatus: profileLicenceId ? licencesById.get(profileLicenceId)?.status ?? null : null,
            createdAt: toTimestamp(data.createdAt),
            updatedAt: toTimestamp(data.updatedAt),
          },
          userMap.get(doc.id),
        ),
      )
    }

    for (const doc of userSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      const membership = membershipsByUid.get(doc.id) ?? null
      const activeLicence = membership ? licencesById.get(membership.licenceId) ?? null : null
      const resolvedPlan = resolveAdminUserPlan({
        uid: doc.id,
        userData: data,
        activeMembership: membership,
        activeLicence,
        schoolLicencesByDomain,
      })
      const membershipSchoolId = membership?.status === "active" ? membership.schoolId : null
      const membershipLicenceId = membership?.status === "active" ? membership.licenceId : null

      userMap.set(
        doc.id,
        mergeAdminUser(
          {
            uid: doc.id,
            email: typeof data.email === "string" ? data.email : undefined,
            plan: resolvedPlan.plan,
            effectivePlan: resolvedPlan.effectivePlan,
            planReason: resolvedPlan.planReason,
            proReason: resolvedPlan.planReason,
            planSource: resolvedPlan.planSource,
            planStatus: typeof data.planStatus === "string" ? data.planStatus : resolvedPlan.plan,
            schoolId: membershipSchoolId ?? userMap.get(doc.id)?.schoolId ?? null,
            schoolName:
              (membershipSchoolId ? schoolsById.get(membershipSchoolId)?.schoolName : null) ??
              userMap.get(doc.id)?.schoolName ??
              null,
            licenceId: membershipLicenceId ?? userMap.get(doc.id)?.licenceId ?? null,
            licenceStatus:
              (membershipLicenceId ? licencesById.get(membershipLicenceId)?.status : null) ??
              userMap.get(doc.id)?.licenceStatus ??
              null,
            createdAt: toTimestamp(data.createdAt),
            updatedAt: toTimestamp(data.updatedAt),
          },
          userMap.get(doc.id),
        ),
      )
    }

    for (const user of authUserPages) {
      userMap.set(
        user.uid,
        mergeAdminUser(
          {
            uid: user.uid,
            email: user.email,
            createdAt: user.createdAt,
          },
          userMap.get(user.uid),
        ),
      )
    }

    const filteredUsers = Array.from(userMap.values()).filter((user) => {
      if (search) {
        const haystacks = [user.email.toLowerCase(), user.uid.toLowerCase()]
        if (!haystacks.some((value) => value.includes(search))) {
          return false
        }
      }

      if (roleFilter && user.role !== roleFilter) {
        return false
      }

      if (planFilter && user.effectivePlan !== planFilter) {
        return false
      }

      return true
    })

    const sortedUsers = sortUsers(filteredUsers, sort)
    const total = sortedUsers.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(page, totalPages)
    const start = (currentPage - 1) * pageSize
    const items = sortedUsers.slice(start, start + pageSize)

    return NextResponse.json({
      success: true,
      items,
      users: items,
      page: currentPage,
      pageSize,
      total,
      totalPages,
      sort,
      filters: {
        search: search || "",
        role: roleFilter || "",
        plan: planFilter || "",
      },
    })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 500 },
      )
    }

    const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 500
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_USERS_LOAD_FAILED",
          message: (error as Error)?.message ?? "Unable to load admin users.",
        },
      },
      { status },
    )
  }
}
