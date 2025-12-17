export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbAdmin } from "@/lib/firebase/admin";
import { writeAudit } from "@/lib/log";

// Lazily initialise Stripe (CRITICAL)
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  return new Stripe(key, {
    apiVersion: "2023-10-16",
  });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Optional: in-memory dedupe (fine for webhooks)
const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();

    const body = await req.text();
    const sig = headers().get("stripe-signature");

    let event: Stripe.Event;

    const testMode = process.env.TEST_MODE === "true";

    if (testMode && (!sig || sig === "test")) {
      event = JSON.parse(body) as Stripe.Event;
    } else {
      if (!sig || !webhookSecret) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }

      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }

    if (processedEvents.has(event.id)) {
      return NextResponse.json({ status: "Already processed" });
    }
    processedEvents.add(event.id);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // your existing logic here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message ?? "Webhook failed" }, { status: 500 });
  }
}
