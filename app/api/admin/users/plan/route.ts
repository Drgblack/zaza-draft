import { NextResponse } from "next/server"

import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles } from "@/lib/auth/roles"
import {
  applyAdminPlanUpdate,
  normalizeAdminPlanReason,
  type AdminPlanUpdateValue,
} from "@/lib/admin/plan-updates"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

function fail(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  )
}

export async function PATCH(request: Request) {
  try {
    assertZazaDraftProject({ context: "PATCH /api/admin/users/plan" })

    const authContext = await authorizeFirebaseRequest(request)
    const { auth, firestore, uid: adminUid } = authContext
    if (!firestore) {
      return fail(500, "FIRESTORE_UNAVAILABLE", "Firestore unavailable.")
    }

    const requesterProfile = await getUserProfile(adminUid, firestore)
    const requesterRole = requesterProfile?.role ?? "teacher_free"
    if (!canAssignRoles(requesterRole)) {
      return fail(403, "SUPER_ADMIN_REQUIRED", "Super admin access required.")
    }

    const body = (await request.json().catch(() => null)) as
      | { targetUid?: string; plan?: AdminPlanUpdateValue; reason?: string }
      | null

    const targetUid = typeof body?.targetUid === "string" ? body.targetUid.trim() : ""
    if (!targetUid) {
      return fail(400, "TARGET_UID_REQUIRED", "targetUid is required.")
    }

    if (body?.plan !== "free" && body?.plan !== "pro") {
      return fail(400, "INVALID_PLAN", "Plan must be free or pro.")
    }

    const targetProfile = await getUserProfile(targetUid, firestore)
    if (targetProfile?.role === "super_admin") {
      return fail(403, "SUPER_ADMIN_PROTECTED", "super_admin plan cannot be changed via admin UI.")
    }

    const targetUserRef = firestore.collection("users").doc(targetUid)
    const [targetUserSnapshot, targetProfileSnapshot, authUserResult] = await Promise.all([
      targetUserRef.get(),
      firestore.collection("user_profiles").doc(targetUid).get(),
      auth
        ? auth
            .getUser(targetUid)
            .then((user) => user)
            .catch((error) => {
              const authError = error as { code?: string }
              if (authError.code === "auth/user-not-found") {
                return null
              }
              throw error
            })
        : Promise.resolve(null),
    ])

    if (!targetUserSnapshot.exists && !targetProfileSnapshot.exists && !authUserResult) {
      return fail(404, "USER_NOT_FOUND", "User not found.")
    }

    const requestedReason = normalizeAdminPlanReason(body?.reason)

    try {
      const { appliedReason } = await applyAdminPlanUpdate({
        firestore,
        targetUid,
        plan: body.plan,
        reason: requestedReason,
      })

      console.info("[admin-action] users_plan_updated", {
        adminUid,
        targetUid,
        plan: body.plan,
        reason: appliedReason,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        uid: targetUid,
        plan: body.plan,
        reason: appliedReason,
      })
    } catch (error) {
      console.error("[admin-action] users_plan_update_failed", {
        adminUid,
        targetUid,
        plan: body.plan,
        reason: requestedReason,
        error,
      })
      return fail(500, "FIRESTORE_UPDATE_FAILED", "Unable to update user plan.")
    }
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    if (error instanceof FirebaseAuthorizationError) {
      return fail(error.statusCode, "UNAUTHORIZED", error.message)
    }

    return fail(500, "ADMIN_USERS_PLAN_UPDATE_FAILED", "Unable to update user plan.")
  }
}
