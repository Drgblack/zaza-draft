# Release checklist (Zaza Draft v1)

## 1. Pre-flight (local)
- pnpm -s test:unit
- pnpm -s lint (if enabled in this repo)
- pnpm -s typecheck (if available)

## 2. Vercel environment parity
Confirm these are set consistently in Preview and Production:
- Firebase env vars used by server routes
- OpenAI / model provider env vars
- Stripe / entitlements env vars (if enabled)
- DEBUG flags (ensure DEBUG_DRAFT_LOGS is not enabled in Production unless explicitly required)

## 3. Smoke tests (Preview)
Run these in both EN and DE UI locale:
- Generate a standard draft with child name and teacher name
- Confirm greeting resolution and sign-off formatting
- Confirm trust-grade violations return structured errors
- Panic Scan: upload and confirm INSUFFICIENT_OCR path shows correct copy
- /api/health returns ok

## 4. Production sanity
- Deploy to Production
- Repeat the smoke tests
- Confirm no unexpected server logs in Production (DEBUG_DRAFT_LOGS off)

## 5. Rollback readiness
- Confirm you know the last good deployment
- Keep a link to RUNBOOK_ROLLBACK.md handy
