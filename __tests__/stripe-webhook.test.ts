import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { NextResponse } from 'next/server';
// Importing mocks directly in factories to avoid vi.mock hoisting issues
let mockStripe: any;
let mockDbAdmin: any;

beforeAll(async () => {
  const m = await import('./__mocks__/stripe');
  mockStripe = m.mockStripe;
  mockDbAdmin = m.mockDbAdmin;
});
vi.mock('stripe', async () => {
  const m = await import('./__mocks__/stripe');
  // Return a constructor that returns the mockStripe object when instantiated
  return {
    default: class StripeMock {
      constructor() {
        return m.mockStripe;
      }
    },
  };
});

vi.mock('@/lib/firebase/admin', async () => {
  const m = await import('./__mocks__/stripe');
  return { dbAdmin: m.mockDbAdmin };
});

// Ensure logging module is available when route is imported
vi.mock('@/lib/log', () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }));
// Mock next/headers so route.headers() reads from the current test Request
vi.mock('next/headers', () => ({
  headers: () => ({
    get: (name: string) => (globalThis as any).__lastReq?.headers?.get(name),
  }),
}));

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles subscription created event', async () => {
    const event = {
      id: 'evt_test123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
        },
      },
    };

    const userDoc = {
      id: 'test-user',
      ref: { update: vi.fn() },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    mockDbAdmin.collection().where().limit().get.mockResolvedValue({
      empty: false,
      docs: [userDoc],
    });

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-sig' },
    });

    // Make headers() in the route read from this Request
    (globalThis as any).__lastReq = req;
    const { POST: webhookHandler } = await import('../app/api/stripe/webhook/route');
    const response = await webhookHandler(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(userDoc.ref.update).toHaveBeenCalledWith({
      plan: 'pro',
      stripeSubscriptionStatus: 'active',
      updatedAt: expect.anything(),
    });
  });

  it('handles subscription canceled event', async () => {
    const event = {
      id: 'evt_test456',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'canceled',
        },
      },
    };

    const userDoc = {
      id: 'test-user',
      ref: { update: vi.fn() },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(event);
    mockDbAdmin.collection().where().limit().get.mockResolvedValue({
      empty: false,
      docs: [userDoc],
    });

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-sig' },
    });

    (globalThis as any).__lastReq = req;
    const { POST: webhookHandler } = await import('../app/api/stripe/webhook/route');
    const response = await webhookHandler(req);
    expect(response).toBeInstanceOf(NextResponse);
    expect(userDoc.ref.update).toHaveBeenCalledWith({
      plan: 'free',
      stripeSubscriptionStatus: 'canceled',
      updatedAt: expect.anything(),
    });
  });

  it('skips duplicate events', async () => {
    const event = {
      id: 'evt_duplicate',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    // First request
    const firstReq = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-sig' },
    });
    (globalThis as any).__lastReq = firstReq;
    const { POST: webhookHandler } = await import('../app/api/stripe/webhook/route');
    await webhookHandler(firstReq);

    // Second request with same event ID
    const secondReq = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-sig' },
    });
    (globalThis as any).__lastReq = secondReq;
    const response = await webhookHandler(secondReq);

    const json = await response.json();
    expect(json.status).toBe('Already processed');
  });
});
