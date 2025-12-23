import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { logServerEvent } from "@/lib/analytics"
import { createStripeClient, getStripeAppUrl } from "@/lib/stripe"

export async function POST(request: Request) {
  const stripeClientContext = createStripeClient()
  if (!stripeClientContext.client) {
    return NextResponse.json(
      { error: `Billing not configured${stripeClientContext.missingKeys.length ? ` (missing ${stripeClientContext.missingKeys.join(", ")})` : ""}` },
      { status: 500 },
    )
  }

  const appUrl = getStripeAppUrl()

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
  const userSnapshot = await firestore.collection("users").doc(uid).get()
  const customerId = userSnapshot.data()?.stripeCustomerId

  if (!customerId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NO_CUSTOMER",
          message: "No billing customer found. Please upgrade from the account page first.",
        },
      },
      { status: 400 },
    )
  }

  const stripeClient = stripeClientContext.client
  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/account`,
  })

  logServerEvent("billing_portal_created", { uid, customerId })

  return NextResponse.json({ url: session.url })
}
