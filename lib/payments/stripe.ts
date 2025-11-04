import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Don't crash module import; throw only if/when the route is actually invoked.
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  _stripe = new Stripe(key, {
    apiVersion: "2024-06-20", // or your pinned version
  });
  return _stripe;
}
