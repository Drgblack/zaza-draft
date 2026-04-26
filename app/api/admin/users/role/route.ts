import { NextResponse } from "next/server"

import { getUserProfile, invalidateUserRoleCache } from "@/lib/auth/get-user-role"
import { canAssignRoles, type ZazaRole } from "@/lib/auth/roles"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

const ASSIGNABLE_ROLES: ZazaRole[] = ["admin", "school_admin", "teacher", "teacher_free"]

function fail(status: number, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: message.replace(/\s+/g, "_").toUpperCase(),
        message,
      },
    },
    { status },
  )
}

export async function PATCH(request: Request) {
  try {
    const authContext = await authorizeFirebaseRequest(request)
    const firestore = authContext.firestore
    if (!firestore) {
      return fail(500, "Firestore unavailable")
    }

    const requesterProfile = await getUserProfile(authContext.uid, firestore)
    const requesterRole = requesterProfile?.role ?? "teacher_free"

    if (!canAssignRoles(requesterRole)) {
      return fail(403, "Super admin access required")
    }

    const body = (await request.json().catch(() => null)) as
      | { targetUid?: string; newRole?: ZazaRole }
      | null
    if (!body || typeof body !== "object") {
      return fail(400, "Invalid payload")
    }

    if (!body.targetUid || typeof body.targetUid !== "string") {
      return fail(400, "targetUid is required")
    }

    if (!body.newRole || typeof body.newRole !== "string") {
      return fail(400, "newRole is required")
    }

    if (body.newRole === "super_admin") {
      return fail(400, "super_admin cannot be assigned via UI")
    }

    if (!ASSIGNABLE_ROLES.includes(body.newRole)) {
      return fail(400, "Invalid role")
    }

    if (body.targetUid === authContext.uid) {
      return fail(400, "You cannot change your own role")
    }

    const targetRef = firestore.collection("user_profiles").doc(body.targetUid)
    const targetSnapshot = await targetRef.get()
    if (!targetSnapshot.exists) {
      return fail(404, "Target user profile not found")
    }

    if (
      body.newRole === "school_admin" &&
      typeof targetSnapshot.data()?.schoolId !== "string"
    ) {
      return fail(400, "school_admin requires an existing schoolId")
    }

    await targetRef.set(
      {
        role: body.newRole,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
    invalidateUserRoleCache(body.targetUid)

    console.info("[admin] role_changed", {
      adminUid: authContext.uid,
      targetUid: body.targetUid,
      newRole: body.newRole,
    })

    return NextResponse.json({ success: true, updated: true })
  } catch (error) {
    const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 500
    return fail(status, (error as Error)?.message ?? "Unable to update user role")
  }
}
