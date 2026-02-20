import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { getUserEntitlements } from "@/lib/entitlements"
import { isInternalQaUid } from "@/lib/auth/internal-qa"
import { extractBearerToken } from "@/lib/auth/bearer"
import { resolveDraftEntitlement } from "@/lib/draft-entitlements"

export async function GET(request: Request) {
  const idToken = extractBearerToken(request)
  if (!idToken) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing authorization token",
        },
      },
      { status: 401 },
    )
  }

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

  const userRef = firestore.collection("users").doc(uid)
  const snapshot = await userRef.get()
  const data = snapshot.data() ?? {}
  const subscriptionStatus = (data.subscriptionStatus as string) ?? "none"
  const localEntitlements = await getUserEntitlements(uid, firestore)
  const draftEntitlement = await resolveDraftEntitlement({
    uid,
    firestore,
    idToken,
    localEntitlements,
  })
  const isQaUser = isInternalQaUid(uid)

  return NextResponse.json({
    success: true,
    data: {
      plan: draftEntitlement.localEntitlements.plan,
      subscriptionStatus,
      priceId: data.priceId ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      stripeCustomerId: data.stripeCustomerId ?? null,
      usage: draftEntitlement.localEntitlements.usage,
      isQaUser,
      draftEntitlement: draftEntitlement.entitlement,
      draftEntitlementSource: draftEntitlement.source,
    },
  })
}
