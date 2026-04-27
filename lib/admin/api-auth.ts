import { NextResponse } from "next/server"
import type { Firestore } from "firebase-admin/firestore"
import type { UserRecord } from "firebase-admin/auth"

import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles, hasAdminAccess } from "@/lib/auth/roles"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

export type AdminRequestAuth =
  | {
      ok: true
      uid: string
      firestore: Firestore
      auth: { getUser: (uid: string) => Promise<UserRecord> } | null
      role: "super_admin" | "admin"
    }
  | { ok: false; response: NextResponse }

function fail(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  )
}

export async function authorizeAdminRequest(
  request: Request,
  requiredRole: "admin" | "super_admin",
): Promise<AdminRequestAuth> {
  try {
    const authContext = await authorizeFirebaseRequest(request)
    if (!authContext.firestore) {
      return { ok: false, response: fail(500, "FIRESTORE_UNAVAILABLE", "Firestore unavailable.") }
    }

    const profile = await getUserProfile(authContext.uid, authContext.firestore)
    const role = (profile?.role ?? "teacher_free") as "super_admin" | "admin" | "teacher_free"

    if (requiredRole === "super_admin") {
      if (!canAssignRoles(role)) {
        return {
          ok: false,
          response: fail(403, "SUPER_ADMIN_REQUIRED", "Super admin access required."),
        }
      }
      return {
        ok: true,
        uid: authContext.uid,
        firestore: authContext.firestore,
        auth: authContext.auth,
        role: "super_admin",
      }
    }

    if (!hasAdminAccess(role)) {
      return {
        ok: false,
        response: fail(403, "ADMIN_REQUIRED", "Admin access required."),
      }
    }

    return {
      ok: true,
      uid: authContext.uid,
      firestore: authContext.firestore,
      auth: authContext.auth,
      role: role === "super_admin" ? "super_admin" : "admin",
    }
  } catch (error) {
    if (error instanceof FirebaseAuthorizationError) {
      return {
        ok: false,
        response: fail(error.statusCode, "UNAUTHORIZED", error.message),
      }
    }

    return {
      ok: false,
      response: fail(401, "UNAUTHORIZED", "Authentication required."),
    }
  }
}
