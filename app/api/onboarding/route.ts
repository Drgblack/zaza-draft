import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status },
    )
  }

  const { uid, firestore } = authContext
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Unable to access Firestore.",
        },
      },
      { status: 500 },
    )
  }

  try {
    const doc = await firestore
      .collection("users")
      .doc(uid)
      .collection("meta")
      .doc("onboarding")
      .get()
    const dismissed = doc.exists ? doc.data()?.dismissed ?? false : false
    return NextResponse.json({ success: true, data: { dismissed } })
  } catch (error) {
    console.error("[onboarding] Failed to load status", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ONBOARDING_FAILED",
          message: "Unable to load onboarding status.",
        },
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status },
    )
  }

  const { uid, firestore } = authContext
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Unable to access Firestore.",
        },
      },
      { status: 500 },
    )
  }

  try {
    await firestore
      .collection("users")
      .doc(uid)
      .collection("meta")
      .doc("onboarding")
      .set(
        {
          dismissed: true,
          dismissedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[onboarding] Failed to mark dismissed", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ONBOARDING_SAVE_FAILED",
          message: "Unable to save your preferences.",
        },
      },
      { status: 500 },
    )
  }
}
