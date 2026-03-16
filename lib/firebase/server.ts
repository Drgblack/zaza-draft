import type { NextRequest } from "next/server"
import type { DecodedIdToken } from "firebase-admin/auth"
import { getFirebaseAdmin, getFirebaseCredentialError } from "@/lib/firebase/admin"

type FirebaseAdminContext = ReturnType<typeof getFirebaseAdmin>

export class FirebaseAuthorizationError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = "FirebaseAuthorizationError"
  }
}

export async function authorizeFirebaseRequest(
  request: Request | NextRequest,
): Promise<{
  uid: string
  decodedToken: DecodedIdToken
  auth: FirebaseAdminContext["auth"]
  firestore: FirebaseAdminContext["firestore"]
  storage: FirebaseAdminContext["storage"]
}> {
  const { auth, firestore, storage } = getFirebaseAdmin()

  if (!auth || !firestore) {
    const message = getFirebaseCredentialError() ?? "Missing Firebase Admin configuration"
    throw new FirebaseAuthorizationError(message, 500)
  }

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw new FirebaseAuthorizationError("Missing authorization token", 401)
  }

  const idToken = authHeader.split(" ")[1]
  try {
    const decoded = await auth.verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      decodedToken: decoded,
      auth,
      firestore,
      storage,
    }
  } catch (error) {
    throw new FirebaseAuthorizationError("Invalid authorization token", 401)
  }
}
