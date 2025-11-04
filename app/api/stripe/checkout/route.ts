export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/payments/stripe";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "");
    const uid = (await adminAuth().verifyIdToken(idToken)).uid;

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // TODO: replace with your real price and customer logic
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/billing?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/billing?status=cancelled`,
      // customer: customerId,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    if (String(err?.message || "").includes("STRIPE_SECRET_KEY is missing")) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Stripe checkout error" }, { status: 500 });
  }
}
