import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authAdmin, dbAdmin } from '@/lib/firebase/admin';
import { headers } from 'next/headers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PRICE_ID = process.env.STRIPE_PRICE_ID!;

export async function POST() {
  try {
    // Get Authorization header
    const authHeader = headers().get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await authAdmin.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/classes?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/classes`,
      client_reference_id: uid,
      metadata: {
        uid,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session creation failed:', err);
    return NextResponse.json(
      { error: 'Payment session creation failed' },
      { status: 500 }
    );
  }
}

// Webhook to handle successful subscriptions
export async function handleSubscription(session: Stripe.Checkout.Session) {
  const uid = session.client_reference_id;
  if (!uid) return;

  await dbAdmin.doc(`users/${uid}`).update({
    plan: 'pro',
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    updatedAt: new Date(),
  });
}