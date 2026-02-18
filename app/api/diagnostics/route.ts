import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getUserEntitlements } from "@/lib/entitlements"
import { getConfiguredModelNames } from "@/lib/ai/provider"
import {
  FirestoreTimestamp,
  DiagnosticsDocument,
  mergeDiagnosticsWithLastRun,
} from "@/lib/diagnostics/merge-last-run"

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
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
    const entitlements = await getUserEntitlements(uid, firestore, { authHeader })
    const userRef = firestore.collection("users").doc(uid)
    const diagDoc = await userRef.collection("diagnostics").doc("status").get()
    const userSnapshot = await userRef.get()
    const userData = userSnapshot.data() ?? {}
    const diagnosticsPayload = mergeDiagnosticsWithLastRun(
      diagDoc.exists ? (diagDoc.data() as DiagnosticsDocument) : null,
      userData.lastDiagnosticsRunAt as FirestoreTimestamp | undefined,
    )

    return NextResponse.json({
      success: true,
      data: {
        models: getConfiguredModelNames(),
        plan: entitlements.plan,
        usage: entitlements.usage,
        entitlement: entitlements.entitlement,
        diagnostics: diagnosticsPayload,
        aiConfigured: Boolean(process.env.OPENAI_API_KEY),
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
