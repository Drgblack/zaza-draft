import Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";

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

/**
 * Ensure a Stripe customer exists for the given user ID.
 * Looks up existing customer ID in Firestore, or creates a new Stripe customer
 * and saves it to Firestore.
 */
export async function ensureStripeCustomerForUid(
  uid: string,
  email?: string,
  name?: string
): Promise<string> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  // Check if user already has a Stripe customer ID
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data?.stripeCustomerId) {
      // Verify the customer still exists in Stripe
      try {
        const stripe = getStripe();
        await stripe.customers.retrieve(data.stripeCustomerId);
        return data.stripeCustomerId;
      } catch (error) {
        // Customer doesn't exist in Stripe, create a new one
        console.warn(`Stripe customer ${data.stripeCustomerId} not found, creating new one`);
      }
    }
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email || userDoc.data()?.email,
    name: name || userDoc.data()?.displayName,
    metadata: {
      firebaseUid: uid,
    },
  });

  // Save customer ID to Firestore
  await userRef.set(
    {
      stripeCustomerId: customer.id,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return customer.id;
}
