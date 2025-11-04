export const revalidate = 0;

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin"; // note: this should be the *function* version
import { getStripe } from "@/lib/payments/stripe";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "");
    const uid = (await adminAuth().verifyIdToken(idToken)).uid;

    const stripe = getStripe(); // lazy init here

    // Look up or create Stripe customer for uid (your logic)
    // const customerId = await ensureStripeCustomerForUid(uid);

    // Example: create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: /* customerId */ "replace-me",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    // If key missing, return 503 so build doesn't crash
    if (String(err?.message || "").includes("STRIPE_SECRET_KEY is missing")) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Stripe portal error" },
      { status: 500 }
    );
  }
}


