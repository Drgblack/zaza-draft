import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { logServerEvent } from "@/lib/analytics"
import { createStripeClient, getStripeAppUrl, getStripePriceId } from "@/lib/stripe"

export async function POST(request: Request) {
  const stripeClientContext = createStripeClient()
  if (!stripeClientContext.client) {
    return NextResponse.json(
      { error: `Billing not configured${stripeClientContext.missingKeys.length ? ` (missing ${stripeClientContext.missingKeys.join(", ")})` : ""}` },
      { status: 500 },
    )
  }

  const { priceId, missingKeys: priceMissing } = getStripePriceId()
  if (!priceId) {
    return NextResponse.json(
      { error: `Billing not configured${priceMissing.length ? ` (missing ${priceMissing.join(", ")})` : ""}` },
      { status: 500 },
    )
  }

  const appUrl = getStripeAppUrl()
  const stripeClient = stripeClientContext.client

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status: 401 },
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
  const userSnapshot = await userRef.get()
  const existingCustomerId = userSnapshot.data()?.stripeCustomerId

  let customerId = existingCustomerId
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      metadata: { uid },
    })
    customerId = customer.id
    await userRef.set({ stripeCustomerId: customerId }, { merge: true })
    await firestore.collection("stripeCustomers").doc(customerId).set({ uid }, { merge: true })
  }
  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/account`,
    allow_promotion_codes: true,
  })

  logServerEvent("checkout_session_created", { uid, customerId })

  if (!session.url) {
    return NextResponse.json(
      { success: false, error: { code: "CHECKOUT_FAILED", message: "Unable to create checkout session." } },
      { status: 500 },
    )
  }

  return NextResponse.json({ url: session.url })
}
