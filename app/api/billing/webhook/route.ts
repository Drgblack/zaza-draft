import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import type { Firestore } from "firebase-admin/firestore"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { createStripeClient, getStripeWebhookSecret } from "@/lib/stripe"
import { logServerEvent } from "@/lib/analytics"

const adminContext = getFirebaseAdmin()

async function resolveUidByCustomerId(customerId: string, firestore: Firestore) {
  const doc = await firestore.collection("stripeCustomers").doc(customerId).get()
  if (doc.exists) {
    const data = doc.data()
    if (data?.uid) {
      return data.uid
    }
  }

  const userQuery = await firestore
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get()
  if (!userQuery.empty) {
    return userQuery.docs[0].id
  }

  return null
}

async function updateBillingForUser(firestore: Firestore, uid: string, customerId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const rawCurrentPeriodEnd = (subscription as { current_period_end?: number }).current_period_end
  const updates = {
    stripeCustomerId: customerId,
    subscriptionStatus: subscription.status,
    priceId,
    currentPeriodEnd: rawCurrentPeriodEnd
      ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    updatedAt: new Date().toISOString(),
  }

  await firestore.collection("users").doc(uid).set(updates, { merge: true })
  await firestore.collection("stripeCustomers").doc(customerId).set({ uid }, { merge: true })
  logServerEvent("subscription_status_changed", { uid, status: subscription.status })
}

export async function POST(request: NextRequest) {
  const stripeContext = createStripeClient()
  if (!stripeContext.client) {
    return NextResponse.json(
      {
        error: `Billing not configured${stripeContext.missingKeys.length ? ` (missing ${stripeContext.missingKeys.join(", ")})` : ""}`,
      },
      { status: 500 },
    )
  }

  const stripeClient = stripeContext.client

  const webhookSecret = getStripeWebhookSecret()
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Billing not configured (missing STRIPE_WEBHOOK_SECRET)" },
      { status: 500 },
    )
  }

  const sig = request.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const body = await request.arrayBuffer()
  let event: Stripe.Event
  try {
    event = stripeClient.webhooks.constructEvent(Buffer.from(body), sig, webhookSecret)
  } catch (error) {
    console.error("[stripe] Webhook verification failed", error)
    return NextResponse.json({ received: false }, { status: 400 })
  }

  logServerEvent("billing_webhook_received", { type: event.type })

  const adminFirestore = adminContext.firestore
  if (!adminFirestore) {
    console.warn("[stripe] Firestore is not configured for webhook handling.")
    return NextResponse.json({ received: true })
  }

  const handleSubscription = async (subscription: Stripe.Subscription) => {
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id
    if (!customerId) return
    const uid = await resolveUidByCustomerId(customerId, adminFirestore)
    if (!uid) return
    await updateBillingForUser(adminFirestore, uid, customerId, subscription)
  }

  const handleCheckoutSession = async (session: Stripe.Checkout.Session) => {
    if (!session.customer || !session.subscription) return
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
    if (!customerId) return
    const uid = await resolveUidByCustomerId(customerId, adminFirestore)
    if (!uid) return
    const subscription = await stripeClient.subscriptions.retrieve(session.subscription as string)
    await updateBillingForUser(adminFirestore, uid, customerId, subscription)
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSession(event.data.object as Stripe.Checkout.Session)
      break
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscription(event.data.object as Stripe.Subscription)
      break
    case "invoice.paid":
    case "invoice.payment_failed":
      logServerEvent("invoice_event", { type: event.type, data: event.data.object })
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
