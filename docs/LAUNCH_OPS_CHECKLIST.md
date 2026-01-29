# Launch Operations Checklist

## 1. Vercel environment parity (Preview vs Production)
- Confirm firebase service credentials, project IDs, and any Firestore emulator toggles are mirrored between Preview and Production.
- Verify OpenAI or provider API keys and model selectors (`MODEL_PROVIDER_KEY`, `MODEL_AXIOS_URL`, etc.) are present in both environments.
- Ensure Stripe/entitlements vars (customer portal, webhook secret) are defined identically where the billing routes run.
- Keep `DEBUG_DRAFT_LOGS` disabled in Production unless an emergency flag is explicitly permitted.

## 2. Stripe sanity checks
- Confirm the webhook signing secret listed in `package.json`/env files matches Production tokens before re-deploying billing routes.
- Validate that the `stripeCustomers` collection is writable by the backend service account in Preview so Production parity is maintained.

## 3. Rollback readiness
- Record the current deployment details in RELEASE_CHECKLIST.md.
- Keep `docs/RUNBOOK_ROLLBACK.md` referenced and accessible in your incident response toolkit.

## 4. Post-deploy monitoring
- Inspect Vercel logs for error spikes immediately after release; flag anything beyond normal rates.
- Confirm `DEBUG_DRAFT_LOGS` is off in Production logs (the flag should only appear in Preview builds).
- Verify daily diagnostic batches (insights summary, usage updates) run without failures; check `app/api/diagnostics/__tests__/merge-last-run.test.ts` for regression coverage if problems arise.

## 5. What to do if something breaks
- Follow `docs/INCIDENT_RESPONSE.md`: open the runbook, triage the severity, notify the on-call, and document the remediation steps.
