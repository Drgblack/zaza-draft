import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getUserEntitlements } from "@/lib/entitlements"
import { getConfiguredModelNames } from "@/lib/ai/provider"

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
    const entitlements = await getUserEntitlements(uid, firestore)
    const diagDoc = await firestore
      .collection("users")
      .doc(uid)
      .collection("diagnostics")
      .doc("status")
      .get()

    return NextResponse.json({
      success: true,
      data: {
        models: getConfiguredModelNames(),
        plan: entitlements.plan,
        usage: entitlements.usage,
        diagnostics: diagDoc.exists ? diagDoc.data() : null,
      },
    })
  } catch (error) {
    console.error("[diagnostics] Failed to load data", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DIAGNOSTICS_FAILED",
          message: "Unable to fetch diagnostics at the moment.",
        },
      },
      { status: 500 },
    )
  }
}
