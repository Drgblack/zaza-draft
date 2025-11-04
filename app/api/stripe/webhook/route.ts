export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { dbAdmin } from '@/lib/firebase/admin';
import { writeAudit } from '@/lib/log';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Track processed events to avoid duplicates
const processedEvents = new Set<string>();

// Handle subscription status changes
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const userSnapshot = await dbAdmin
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (userSnapshot.empty) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  const userDoc = userSnapshot.docs[0];
  const isActive = subscription.status === 'active';

  await userDoc.ref.update({
    plan: isActive ? 'pro' : 'free',
    stripeSubscriptionStatus: subscription.status,
    updatedAt: new Date(),
  });

  console.log(`Updated user ${userDoc.id} plan to ${isActive ? 'pro' : 'free'}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = headers().get('stripe-signature');

    let event: Stripe.Event;

    // If TEST_MODE is enabled, allow mocked events without signature (for CI/local tests)
    const testMode = process.env.TEST_MODE === 'true';
    if (testMode && (!sig || sig === 'test')) {
      // attempt to parse as JSON event
      try {
        event = JSON.parse(body) as Stripe.Event;
      } catch (err) {
        return NextResponse.json({ error: 'Invalid test event' }, { status: 400 });
      }
    } else {
      if (!sig) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
      }
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err?.message || err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Skip if already processed
    if (processedEvents.has(event.id)) {
      return NextResponse.json({ status: 'Already processed' });
    }
    processedEvents.add(event.id);

    // Handle subscription events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        // write audit
        try {
          // map customer to uid for audit
          const customerId = subscription.customer as string;
          const userSnapshot = await dbAdmin.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
          const uid = !userSnapshot.empty ? userSnapshot.docs[0].id : undefined;
          await writeAudit({ event: 'plan_changed', uid, route: '/api/stripe/webhook', details: { customerId, status: subscription.status, stripeEventId: event.id } });
        } catch (e) {
          // ignore audit failures
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Initial checkout already handled in checkout route
        console.log('Checkout completed:', session.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
