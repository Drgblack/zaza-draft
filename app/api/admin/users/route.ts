import { NextResponse } from "next/server"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles, type ZazaRole } from "@/lib/auth/roles"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

type AdminUserRecord = {
  uid: string
  email: string
  role: ZazaRole
  plan: string
  effectivePlan: string
  planStatus: string
  proReason: string | null
  schoolId: string | null
  createdAt: number
  updatedAt: number
}

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
  if (
    value === "super_admin" ||
    value === "admin" ||
    value === "school_admin" ||
    value === "teacher" ||
    value === "teacher_free"
  ) {
    return value
  }

  return "teacher_free"
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
    effectivePlan: source.effectivePlan ?? existing?.effectivePlan ?? source.plan ?? existing?.plan ?? "free",
    planStatus: source.planStatus ?? existing?.planStatus ?? "free",
    proReason: source.proReason ?? existing?.proReason ?? null,
    schoolId: source.schoolId ?? existing?.schoolId ?? null,
    createdAt: source.createdAt ?? existing?.createdAt ?? 0,
    updatedAt: source.updatedAt ?? existing?.updatedAt ?? 0,
  }
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

    const [profileSnapshot, userSnapshot, authUserPages] = await Promise.all([
      firestore.collection("user_profiles").get(),
      firestore.collection("users").get(),
      (async () => {
        if (!auth) {
          return []
        }

        const users: Array<{ uid: string; email: string; createdAt: number }> = []
        let nextPageToken: string | undefined

        do {
          const page = await auth.listUsers(1000, nextPageToken)
          users.push(
            ...page.users.map((user) => ({
              uid: user.uid,
              email: user.email ?? "",
              createdAt: user.metadata.creationTime
                ? Date.parse(user.metadata.creationTime) || 0
                : 0,
            })),
          )
          nextPageToken = page.pageToken
        } while (nextPageToken)

        return users
      })(),
    ])

    const userMap = new Map<string, AdminUserRecord>()

    for (const doc of profileSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      userMap.set(
        doc.id,
        mergeAdminUser(
          {
            uid: doc.id,
            email: typeof data.email === "string" ? data.email : "",
            role: normaliseRole(data.role),
            plan: typeof data.planStatus === "string" ? data.planStatus : "free",
            planStatus: typeof data.planStatus === "string" ? data.planStatus : "free",
            schoolId: typeof data.schoolId === "string" ? data.schoolId : null,
            createdAt: toTimestamp(data.createdAt),
            updatedAt: toTimestamp(data.updatedAt),
          },
          userMap.get(doc.id),
        ),
      )
    }

    for (const doc of userSnapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      const entitlementOverride =
        typeof data.entitlements === "object" &&
        data.entitlements !== null &&
        typeof (data.entitlements as Record<string, unknown>).planOverride === "string"
          ? (data.entitlements as Record<string, unknown>).planOverride as string
          : null
      const plan =
        typeof data.plan === "string"
          ? data.plan
          : typeof data.accountType === "string"
            ? data.accountType
            : "free"
      const effectivePlan = entitlementOverride === "pro" ? "pro" : plan
      const entitlementsReason =
        typeof data.entitlements === "object" &&
        data.entitlements !== null &&
        typeof (data.entitlements as Record<string, unknown>).reason === "string"
          ? (data.entitlements as Record<string, unknown>).reason as string
          : typeof data.reason === "string"
            ? data.reason
            : null
      userMap.set(
        doc.id,
        mergeAdminUser(
          {
            uid: doc.id,
            email: typeof data.email === "string" ? data.email : undefined,
            plan,
            effectivePlan,
            planStatus: typeof data.planStatus === "string" ? data.planStatus : plan,
            proReason: effectivePlan === "pro" ? entitlementsReason : null,
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

    const users = Array.from(userMap.values())
      .sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ success: true, users })
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
