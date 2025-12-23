import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { buildUsageResponse, fetchUsageRecord, PlanType } from "@/lib/usage"

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
  const userRef = firestore.collection("users").doc(uid)
  const snapshot = await userRef.get()
  const data = snapshot.data() ?? {}
  const subscriptionStatus = (data.subscriptionStatus as string) ?? "none"
  const plan: PlanType = ["active", "trialing"].includes(subscriptionStatus) ? "pro" : "free"

  const usageRecord = await fetchUsageRecord(uid, firestore)

  return NextResponse.json({
    success: true,
    data: {
      plan,
      subscriptionStatus,
      priceId: data.priceId ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      stripeCustomerId: data.stripeCustomerId ?? null,
      usage: buildUsageResponse(usageRecord, plan),
    },
  })
}
