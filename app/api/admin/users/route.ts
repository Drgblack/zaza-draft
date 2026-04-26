import { NextResponse } from "next/server"

import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getUserProfile } from "@/lib/auth/get-user-role"
import { canAssignRoles } from "@/lib/auth/roles"

export async function GET(request: Request) {
  try {
    const authContext = await authorizeFirebaseRequest(request)
    const firestore = authContext.firestore
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

    const snapshot = await firestore.collection("user_profiles").get()
    const users = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>
        return {
          uid: doc.id,
          email: typeof data.email === "string" ? data.email : "",
          role: typeof data.role === "string" ? data.role : "teacher_free",
          planStatus: typeof data.planStatus === "string" ? data.planStatus : "free",
          schoolId: typeof data.schoolId === "string" ? data.schoolId : null,
          createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
          updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ success: true, users })
  } catch (error) {
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
