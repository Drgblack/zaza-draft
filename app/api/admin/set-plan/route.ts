import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles } from "@/lib/auth/roles"
import { assertZazaDraftProject, FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

type PlanValue = "free" | "pro"

function normalizeReason(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status },
  )
}

export async function PATCH(request: Request) {
  try {
    assertZazaDraftProject({ context: "PATCH /api/admin/set-plan" })

    const authContext = await authorizeFirebaseRequest(request)
    const { auth, firestore, uid: adminUid } = authContext

    if (!auth) {
      return fail(500, "FIREBASE_AUTH_UNAVAILABLE", "Firebase Admin Auth unavailable.")
    }

    if (!firestore) {
      return fail(500, "FIRESTORE_UNAVAILABLE", "Firestore unavailable.")
    }

    const requesterProfile = await getUserProfile(adminUid, firestore)
    const requesterRole = requesterProfile?.role ?? "teacher_free"

    if (!canAssignRoles(requesterRole)) {
      return fail(403, "SUPER_ADMIN_REQUIRED", "Super admin access required.")
    }

    const body = (await request.json().catch(() => null)) as
      | { email?: string; plan?: PlanValue; reason?: string }
      | null
    const targetEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!targetEmail) {
      return fail(400, "EMAIL_REQUIRED", "Email is required.")
    }

    if (body?.plan !== "free" && body?.plan !== "pro") {
      return fail(400, "INVALID_PLAN", "Plan must be free or pro.")
    }

    const requestedReason = normalizeReason(body?.reason)

    let targetUser: Awaited<ReturnType<typeof auth.getUserByEmail>>
    try {
      targetUser = await auth.getUserByEmail(targetEmail)
    } catch (error) {
      const authError = error as { code?: string }
      if (authError.code === "auth/user-not-found") {
        return fail(404, "USER_NOT_FOUND", "User not found.")
      }
      throw error
    }

    const patch =
      body.plan === "pro"
        ? {
            plan: "pro",
            monthlyDraftLimit: 999,
            entitlements: {
              planOverride: "pro",
              reason: requestedReason ?? "manual upgrade",
              expiresAt: null,
            },
            updatedAt: FieldValue.serverTimestamp(),
          }
        : {
            plan: "free",
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

    try {
      await firestore.collection("users").doc(targetUser.uid).set(patch, { merge: true })
    } catch (error) {
      console.error("[admin-action] set_plan_firestore_failed", {
        adminUid,
        targetEmail,
        targetUid: targetUser.uid,
        plan: body.plan,
        reason: requestedReason,
        error,
      })
      return fail(500, "FIRESTORE_UPDATE_FAILED", "Unable to update user plan.")
    }

    console.info("[admin-action] set_plan", {
      adminUid,
      targetEmail,
      targetUid: targetUser.uid,
      plan: body.plan,
      reason: body.plan === "pro" ? requestedReason ?? "manual upgrade" : null,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      uid: targetUser.uid,
      plan: body.plan,
      reason: body.plan === "pro" ? requestedReason ?? "manual upgrade" : null,
    })
  } catch (error) {
    if (error instanceof FirebaseProjectSafetyError) {
      return fail(500, error.code, error.message)
    }

    if (error instanceof FirebaseAuthorizationError) {
      return fail(error.statusCode, "UNAUTHORIZED", error.message)
    }

    console.error("[admin-action] set_plan_failed", error)
    return fail(500, "SET_PLAN_FAILED", "Unable to update user plan.")
  }
}
