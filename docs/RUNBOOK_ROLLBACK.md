# Rollback runbook (Vercel)

## When to rollback
Rollback if any of these occur after deployment:
- Draft route returns 5xx for valid inputs
- Trust-grade contract responses regress (EN or DE)
- Panic Scan upload errors spike or returns malformed JSON
- Auth or entitlements fail for known-good accounts

## How to rollback (v1)
1. Open the Vercel project deployments.
2. Identify the last known good Production deployment.
3. Promote it to Production (or redeploy that commit).
4. Re-run the Production smoke tests in RELEASE_CHECKLIST.md.

## What to capture
- Deployment id and timestamp
- The failing request type (draft, panic scan, auth)
- Any relevant requestId logged by the API
- The commit SHA that caused the regression (if known)
