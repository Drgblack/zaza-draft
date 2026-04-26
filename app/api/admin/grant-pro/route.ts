import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles } from "@/lib/auth/roles"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

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

export async function POST(request: Request) {
  try {
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

    const body = (await request.json().catch(() => null)) as { email?: string } | null
    const targetEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!targetEmail) {
      return fail(400, "EMAIL_REQUIRED", "Email is required.")
    }

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

    try {
      await firestore.collection("users").doc(targetUser.uid).set(
        {
          plan: "pro",
          monthlyDraftLimit: 999,
          entitlements: {
            planOverride: "pro",
            reason: "manual upgrade",
            expiresAt: null,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    } catch (error) {
      console.error("[admin-action] grant_pro_firestore_failed", {
        adminUid,
        targetEmail,
        targetUid: targetUser.uid,
        error,
      })
      return fail(500, "FIRESTORE_UPDATE_FAILED", "Unable to grant Pro access.")
    }

    console.info("[admin-action] grant_pro", {
      adminUid,
      targetEmail,
      targetUid: targetUser.uid,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      uid: targetUser.uid,
    })
  } catch (error) {
    if (error instanceof FirebaseAuthorizationError) {
      return fail(error.statusCode, "UNAUTHORIZED", error.message)
    }

    console.error("[admin-action] grant_pro_failed", error)
    return fail(500, "GRANT_PRO_FAILED", "Unable to grant Pro access.")
  }
}
