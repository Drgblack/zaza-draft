# Zaza Draft App (Post-v0)

## Phase 1 API

- **Endpoint:** `POST /api/draft/generate`
- **Payload:** user prompt (`situation`), chosen `tone`, `language` (`en`/`de`), and optional `context` (`subject`, `gradeLevel`).
- **Response:** `generatedDraft` text, `metadata` (tone, language, placeholder model, timing, word count, safety flags, timestamps, used context), and `usage` (current month count, limit, remaining). Errors contain `success: false`, `error.code`, `error.message`, and a `data.redactedPreview` if sensitive data was stripped.
- **Safety assumptions:** input is rejected if it contains detectable emails, phone numbers, or street addresses; users are reminded not to submit student full names or private identifiers; metadata flags `safetyFlags` for downstream logging.
- **Temporary notes:** AI provider calls are still placeholder drafts, but auth and usage now rely on Firebase (see below).

## Firebase configuration (Phase 2a)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)
- `FIREBASE_SERVICE_ACCOUNT_KEY` – JSON string with the service account credential (used by the admin SDK to verify tokens and manage Firestore). Example: `cat service-account.json | jq -c . | pbcopy`.

The client now uses Firebase Auth (email/password + Google) and surface the support email `greg@zazatechnologies.com` on the login screen. Every request to `/api/draft/generate` must include `Authorization: Bearer <id-token>`; the server verifies the token and enforces the 10-draft/month free tier in Firestore (`users/{uid}.monthlyUsage`).

For more details, see `docs/spec/Zaza Draft - Technical Specification.md`.

## Phase 2b Billing & Analytics

- **Stripe + Firestore**: The free tier remains capped at 10 drafts/month (enforced in `/api/draft/generate`), while paid `Draft Pro` subscribers enjoy unlimited drafts. `/api/account/status` reports the current plan/usage, `/api/billing/checkout` and `/api/billing/portal` drive the client upgrade/manage flows, and `/api/billing/webhook` syncs Stripe events into Firestore (making sure `users/{uid}` stores `stripeCustomerId`, `subscriptionStatus`, `priceId`, `currentPeriodEnd`, `cancelAtPeriodEnd`, and a `stripeCustomers/{customerId}` reverse lookup).
- **Analytics**: Client events (`auth_login_success`, `draft_generate_requested`, `draft_generate_succeeded`, `draft_generate_failed`, `upgrade_clicked`, `manage_subscription_clicked`, `checkout_redirected`) are logged via `lib/analytics`, while the server emits `draft_generation`, `billing_webhook_received`, `checkout_session_created`, `billing_portal_created`, `subscription_status_changed`, and `invoice_event`.

### Required environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_DRAFT_PRO` (the price ID for the Draft Pro monthly plan)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (used in success/cancel URLs for Stripe and should match `http://localhost:3000` in dev)

Firebase envs are already listed above in the Phase 2a section and remain required.

### Manual billing test checklist

1. Run `stripe listen --forward-to http://localhost:3000/api/billing/webhook` to forward events locally. Make sure `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret printed by the CLI.
2. Call `POST http://localhost:3000/api/billing/checkout` with a valid Firebase ID token (`Authorization: Bearer <id-token>`) to create a Checkout session, and follow the returned URL to complete payment with test card numbers.
3. After `checkout.session.completed` and related webhook events fire, verify Firestore under `users/{uid}` contains the expected billing fields and `stripeCustomers/{customerId}` maps back to the user.
4. Confirm `/api/account/status` now reports `plan: "pro"` and a null `limit`, and `/api/draft/generate` returns `usage.plan === "pro"` without enforcing the 10-draft cap.
5. Repeat the flow for a free account to ensure the limit is enforced (expect `USAGE_LIMIT_EXCEEDED` once 10 drafts are consumed).
