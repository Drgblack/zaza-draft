# Zaza Draft – Work Summary

**Branch:** feature/v0-ui-complete
**Compared to:** f99e31fcf5d8df6fb68c91e4cb3ee4b68ebfcf00
**Since:** 2025-10-26 11:41:40 +0100

## Headline numbers
* Commits: 0
* Files/lines:  311 files changed, 45887 insertions(+), 88 deletions(-)

## Work areas touched
``
app/(home)/HomeClient.tsx
app/about/page.tsx
app/account/billing/page.tsx
app/analytics/page.tsx
app/api/classes/[id]/route.ts
app/api/classes/route.ts
app/api/cron/rollup/route.ts
app/api/dev/cleanup-old-events/route.ts
app/api/dev/optin/route.ts
app/api/dev/rollup-now/route.ts
app/api/draft/generate/logger.ts
app/api/draft/generate/retry.test.ts
app/api/draft/generate/retry.ts
app/api/draft/generate/retry.util.test.ts
app/api/draft/generate/route.ts
app/api/draft/generate/timeout.test.ts
app/api/draft/generate/timeout.ts
app/api/draft/generate/tone-map.ts
app/api/events/ingest/route.ts
app/api/export/my-data.csv/route.ts
app/api/health/route.ts
app/api/insights/weekly/route.ts
app/api/me/profile/route.ts
app/api/stripe/checkout/route.ts
app/api/stripe/portal/route.ts
app/api/stripe/webhook/route.ts
app/auth/reset-password/page.tsx
app/auth/signin/page.tsx
app/auth/signup/page.tsx
app/classes/[id]/page.tsx
app/classes/page.tsx
app/community/loading.tsx
app/community/page.tsx
app/components/auth/index.ts
app/components/auth/ProtectedRoute.tsx
app/components/auth/ResetPasswordForm.tsx
app/components/auth/SignInForm.tsx
app/components/auth/SignUpForm.tsx
app/components/auth/validation.ts
app/components/billing/UpgradeButton.tsx
app/components/classes/AddStudentForm.tsx
app/components/classes/ClassDetail.tsx
app/components/classes/ClassList.tsx
app/components/classes/CreateClassForm.tsx
app/components/classes/EditStudentModal.tsx
app/components/classes/StudentsTable.tsx
app/components/DraftClient.tsx
app/components/draft-constants.ts
app/components/Tooltip.tsx
app/components/ui/ConfirmDialog.tsx
app/components/ui/Spinner.tsx
app/contact/page.tsx
app/drafts/page.tsx
app/faq/page.tsx
app/globals.css
app/insights/page.tsx
app/layout.tsx
app/loading.tsx
app/page.backup.tsx
app/page.tsx
app/privacy/page.tsx
app/providers/AuthProvider.tsx
app/settings/page.tsx
app/team/loading.tsx
app/team/page.tsx
app/templates/loading.tsx
app/templates/page.tsx
app/terms/page.tsx
functions/src/usage/reset-monthly.ts
lib/analytics/auth-limit.ts
lib/analytics/events.ts
lib/analytics/track.ts
lib/auth/context.ts
lib/auth/hooks.ts
lib/auth/index.ts
lib/auth/middleware.ts
lib/auth/provider.tsx
lib/auth/types.ts
lib/auth/utils.ts
lib/export-utils.tsx
lib/firebase/admin.ts
lib/firebase/client.ts
lib/firebase/config.ts
lib/firebaseClient.ts
lib/firestore/server.ts
lib/firestore/usage.ts
lib/firestore/usage-client.ts
lib/i18n/locales/de-DE/common.json
lib/i18n/locales/en-GB/common.json
lib/i18n/locales/en-US/common.json
lib/log.ts
lib/payments/stripe.ts
lib/rateLimit.ts
lib/stripeClient.ts
lib/translations.ts
lib/utils.ts
scripts/release-check.js
scripts/set-test-changed.js
scripts/smoke-draft.mjs
scripts/test-changed.js
scripts/test-changed-unified.js
scripts/test-glob.js
scripts/vercel-bypass-smoke.ps1
scripts/verify-lock.mjs
``

## Directory churn (percentage of files changed per directory)
``
   0.3% .github/workflows/
   0.3% .husky/
   0.3% .vscode/
   0.6% __tests__/__mocks__/
   1.6% __tests__/
   0.3% app/(home)/
   0.3% app/about/
   0.3% app/account/billing/
   0.3% app/analytics/
   0.3% app/api/classes/[id]/
   0.3% app/api/classes/
   0.3% app/api/cron/rollup/
   0.3% app/api/dev/cleanup-old-events/
   0.3% app/api/dev/optin/
   0.3% app/api/dev/rollup-now/
   2.5% app/api/draft/generate/
   0.3% app/api/events/ingest/
   0.3% app/api/export/my-data.csv/
   0.3% app/api/health/
   0.3% app/api/insights/weekly/
   0.3% app/api/me/profile/
   0.3% app/api/stripe/checkout/
   0.3% app/api/stripe/portal/
   0.3% app/api/stripe/webhook/
   0.3% app/auth/reset-password/
   0.3% app/auth/signin/
   0.3% app/auth/signup/
   0.3% app/classes/[id]/
   0.3% app/classes/
   0.6% app/community/
   1.9% app/components/auth/
   0.3% app/components/billing/
   1.9% app/components/classes/
   0.6% app/components/ui/
   0.9% app/components/
   0.3% app/contact/
   0.3% app/drafts/
   0.3% app/faq/
   0.3% app/insights/
   0.3% app/privacy/
   0.3% app/providers/
   0.3% app/settings/
   0.6% app/team/
   0.6% app/templates/
   0.3% app/terms/
   1.6% app/
   0.3% components/settings/
  18.3% components/ui/
   9.9% components/
   0.9% contexts/
   0.3% docs/api/
   0.3% docs/backend/
   7.0% docs/
   1.2% e2e/
   0.3% functions/src/usage/
   1.2% gpts/draft/examples/
   1.9% gpts/draft/
   1.6% hooks/
   0.9% lib/analytics/
   2.2% lib/auth/
   0.9% lib/firebase/
   0.9% lib/firestore/
   0.3% lib/i18n/locales/de-DE/
   0.3% lib/i18n/locales/en-GB/
   0.3% lib/i18n/locales/en-US/
   0.3% lib/payments/
   2.2% lib/
   1.9% public/
   0.3% requests/
   2.5% scripts/
   0.3% src/components/insights/v0-iterations/
   0.3% src/components/
   0.3% src/data/
   0.3% styles/
``

## Inserts/Deletes by file type

| Ext | Insertions | Deletions | Net |
|-----|------------|-----------|-----|

## Top contributors
``
``

## Commit log