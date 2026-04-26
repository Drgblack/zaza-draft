import { NextResponse } from "next/server"

import {
  ADMIN_SESSION_COOKIE_MAX_AGE,
  ADMIN_SESSION_COOKIE_MAX_AGE_MS,
  ADMIN_SESSION_COOKIE_NAME,
} from "@/lib/auth/admin-session"
import { getUserRole } from "@/lib/auth/get-user-role"
import { hasAdminAccess } from "@/lib/auth/roles"
import { getFirebaseAdmin } from "@/lib/firebase/admin"

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

export async function GET() {
  return fail(400, "USE_POST", "Use POST to establish an admin session.")
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: string } | null
  if (!body?.idToken || typeof body.idToken !== "string") {
    return fail(400, "ID_TOKEN_REQUIRED", "A Firebase ID token is required.")
  }

  const { auth, firestore } = getFirebaseAdmin()
  if (!auth) {
    return fail(500, "FIREBASE_AUTH_UNAVAILABLE", "Firebase Admin Auth unavailable.")
  }

  if (!firestore) {
    return fail(500, "FIRESTORE_UNAVAILABLE", "Firestore unavailable.")
  }

  let decodedToken: Awaited<ReturnType<typeof auth.verifyIdToken>>
  try {
    decodedToken = await auth.verifyIdToken(body.idToken)
  } catch (error) {
    console.error("[admin-session] verify_id_token_failed", error)
    return fail(403, "INVALID_ID_TOKEN", "Unable to verify admin sign-in.")
  }

  const role = await getUserRole(decodedToken.uid, firestore)
  if (!hasAdminAccess(role)) {
    return fail(403, "INSUFFICIENT_PERMISSIONS", "Insufficient permissions")
  }

  try {
    const sessionCookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: ADMIN_SESSION_COOKIE_MAX_AGE_MS,
    })

    const response = NextResponse.json(
      {
        success: true,
        session: {
          uid: decodedToken.uid,
          role,
        },
      },
      { status: 200 },
    )

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_COOKIE_MAX_AGE,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[admin-session] create_session_cookie_failed", {
      uid: decodedToken.uid,
      role,
      error,
    })
    return fail(500, "SESSION_COOKIE_CREATION_FAILED", "Unable to create admin session.")
  }
}
