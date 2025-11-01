import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authAdmin } from '@/lib/firebase/admin';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29',
});

export async function POST() {
  try {
    const authHeader = headers().get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await authAdmin.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Find Stripe customer ID for user
    // (Assume Firestore user doc has stripeCustomerId)
    // You may want to fetch from Firestore here
    // For demo, just use a placeholder
    const stripeCustomerId = decodedToken.stripeCustomerId || 'cus_demo';

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal session failed:', err);
    return NextResponse.json({ error: 'Portal session failed' }, { status: 500 });
  }
}
