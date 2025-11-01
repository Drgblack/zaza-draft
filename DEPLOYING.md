# DEPLOYING

This document describes the manual steps and required configuration to deploy Zaza Draft safely.

## Required environment variables

- STRIPE_SECRET_KEY — Stripe secret key (starts with `sk_`).
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — Stripe publishable key (starts with `pk_`).
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (from Stripe dashboard).
- FIREBASE_PRIVATE_KEY — Service account private key for Firebase Admin SDK.
- FIREBASE_PROJECT_ID or GCLOUD_PROJECT — Firebase project ID used by server-side code.
- NEXT_PUBLIC_FIREBASE_PROJECT_ID — Client-side Firebase project ID (must match server project ID).
- NEXT_PUBLIC_BASE_URL — Public HTTPS URL for the deployed app (e.g., `https://app.example.com`).
- TEST_MODE — Optional; when `true` enables test-mode behaviors in CI/test. Must be unset or `false` in production CI.

Add these to your deployment environment or CI secrets before a release.

## Stripe: webhook setup

1. In the Stripe Dashboard, create a webhook endpoint pointing to your deployed app's `/api/stripe/webhook` route.
2. Subscribe to events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in your deployment/CI secrets.

## Monthly reset cron (scheduled function)

We use a Firebase Cloud Function to reset usage counters monthly.

- File: `functions/src/usage/reset-monthly.ts`
- Deploy with `firebase deploy --only functions:resetMonthlyUsage` (or deploy all functions).
- Ensure the service account used by `FIREBASE_PRIVATE_KEY` has permissions to list and update Firestore documents.

## Firestore rules

Store your Firestore rules in `firestore.rules` at repo root. Deploy with:

```
firebase deploy --only firestore:rules
```

Ensure rules are tested locally (emulator) if possible before deploying.

## CI preflight behavior

The CI workflow runs `pnpm run release:check` after build and tests. The script verifies:

- Required env vars are present
- Server project id (`FIREBASE_PROJECT_ID` or `GCLOUD_PROJECT`) matches `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_BASE_URL` is HTTPS and not localhost in production CI
- `TEST_MODE` is not enabled in production CI
- Stripe keys look structurally valid
- `functions/src/usage/reset-monthly.ts` exists and `firestore.rules` exists

If any check fails, the workflow exits with a non-zero code and provides remediation hints.

## Rollback steps

If a release introduces a critical failure:

1. Revert the release commit on the `main` branch and re-deploy the previous tag.
2. On Vercel (or your hosting provider), use the rollback/restore UI to point the production domain to the previous deployment.
3. If database migrations were applied, run compensating migrations if necessary or restore from a backup.
4. Revoke any compromised Stripe keys and rotate them; update secrets in CI and redeploy.

## Post-deploy checklist

- Confirm webhook events are being received by checking Stripe logs.
- Verify scheduled function executed at the expected cadence (check logs).
- Validate Firestore rules by attempting allowed/denied operations.
- Check the CI artifact (Playwright HTML report) for E2E results.

