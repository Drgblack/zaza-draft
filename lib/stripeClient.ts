"use client";
import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Never run during SSR
  if (typeof window === "undefined") return null;

  // Require a publishable key
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Stripe disabled: missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    }
    return null;
  }

  // Basic sanity check
  if (!/^pk_(test|live)_/.test(key)) {
    console.error("Stripe key must start with pk_test_ or pk_live_. Got:", key);
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
