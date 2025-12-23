import type { NextRequest } from "next/server"
import { getFirebaseAdmin } from "@/lib/firebase/admin"

type FirebaseAdminContext = ReturnType<typeof getFirebaseAdmin>

export async function authorizeFirebaseRequest(
  request: Request | NextRequest,
): Promise<{ uid: string; auth: FirebaseAdminContext["auth"]; firestore: FirebaseAdminContext["firestore"] }> {
  const { auth, firestore } = getFirebaseAdmin()

  if (!auth || !firestore) {
    throw new Error("Missing Firebase Admin configuration")
  }

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token")
  }

  const idToken = authHeader.split(" ")[1]
  const decoded = await auth.verifyIdToken(idToken)
  return {
    uid: decoded.uid,
    auth,
    firestore,
  }
}
