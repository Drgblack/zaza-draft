export const revalidate = 0;

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getStripe, ensureStripeCustomerForUid } from "@/lib/payments/stripe";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "");
    const decoded = await adminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Get user data for email/name
    const userDoc = await adminDb().collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Ensure Stripe customer exists
    const customerId = await ensureStripeCustomerForUid(
      uid,
      decoded.email || userData?.email,
      userData?.displayName || decoded.name
    );

    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
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
    console.error("Stripe portal error:", err);
    return NextResponse.json(
      { error: "Stripe portal error" },
      { status: 500 }
    );
  }
}


