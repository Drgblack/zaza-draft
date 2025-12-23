import Stripe from "stripe"

const stripeApiVersion = "2025-12-15.clover"

export function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return { client: null as Stripe | null, missingKeys: ["STRIPE_SECRET_KEY"] }
  }

  return {
    client: new Stripe(secretKey, {
      apiVersion: stripeApiVersion,
    }),
    missingKeys: [] as string[],
  }
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_DRAFT_PRO
  return {
    priceId: priceId ?? null,
    missingKeys: priceId ? [] : ["STRIPE_PRICE_DRAFT_PRO"],
  }
}

export function getStripeAppUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL
  if (raw) {
    return raw.replace(/\/$/, "")
  }
  return "https://zaza-draft.vercel.app"
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null
}
