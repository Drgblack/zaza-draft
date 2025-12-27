# Spec Alignment Report

## Implemented but not in spec
- **Safety tiered auto-reframe (Tier 1/2) & Tier 3 hard reject** – implemented via `lib/safety.ts`, `/app/api/draft/generate/route.ts`, and client notices in `components/main-editor.tsx`. Suggest adding a safety section to the spec.
- **Never-fail fallback generation + metadata** – `lib/draft/fallback.ts` plus `/app/api/draft/generate/route.ts` now return `usedFallback`, `errorCode`, and fallback drafts when providers fail. Document under resilience or monitoring.
- **Parent message / Report comment mode selector** – UI in `components/main-editor.tsx` plus backend handling, metadata, and exports reference this mode (e.g., snippets payload, `/app/api/export/pdf/route.ts`). Please capture this new mode in the spec’s request/metadata sections.
- **Dataset-backed pronoun inference** – scripts generate `src/generated/name-gender.ts` and `lib/text/pronouns.ts` now infer pronouns from the name list with “avoid” fallbacks; the spec should mention this guardrail in pronoun handling.
- **PDF export endpoint & download flow** – implemented in `app/api/export/pdf/route.ts` plus `components/draft-output.tsx`; doc should mention server-generated PDFs and new client download handling.
- **Internal QA allowlist + UID reveal flag** – `lib/auth/internal-qa.ts`, `/app/api/draft/generate/route.ts`, `lib/dev/feature-flags.ts`, and `/app/account/page.tsx` support `INTERNAL_QA_UIDS` and `NEXT_PUBLIC_SHOW_UID`; consider recording these developer tools under QA tooling.

## In spec but deferred
- **Class/cross-app collections (classes, students, zaza_accounts, tags, subscriptions, analyticsEvents, generation_logs, feedback)** – Spec describes rich schema and syncing that the current repo omits. Recommend marking these as Phase 2 (post-launch) items since we’re not building them now.
- **Unified Zaza account system & Class Brain sync** – Spec’s cross-app architecture (shared `zaza_accounts`, sync endpoints) is not implemented. Defer to Phase 2.
- **Tag filtering/search UI** – Filter/spec mentions tags/language search for snippets; current implementation only has basic history. Recommend Phase 2.
- **GDPR delete/export endpoints** – Not present yet; flagged as Phase 1 must-haves below.
- **CI/CD workflow (GitHub Actions)** – Current repo lacks the spec’d workflow. Continue planning for later but mark as Phase 2 if not urgent.

## In spec and MUST implement now (minimal launch trust)
- **Safety tier policy aligned with implementation** – Document Tier 1/2 auto-reframe vs Tier 3 rejection; ensures safety expectations match code.
- **Never-fail fallback generation** – Need spec coverage for fallback drafts, metadata fields, and resilient logging.
- **Mode selector (parent_message/report_comment)** – Ensure spec describes allowed values, prompt rules, and snippet metadata.
- **Pronoun inference from dataset** – Add section describing dataset-backed inference with they/them fallback when Auto lacks confidence.
- **Exports** – PDF export endpoint + client flow must be documented.
- **Internal QA tooling** – Document `INTERNAL_QA_UIDS` bypass and `NEXT_PUBLIC_SHOW_UID` flag to align spec with dev tooling.
- **GDPR endpoints (export/delete)** – Spec requires `/api/account/export` and `/api/account/delete` along with UI controls (mandatory for alignment).
- **Rate limiting (10 requests/min)** – Need spec description for new limiter.
- **Firestore rules** – Update spec to reflect actual security rules (auth-based access, limited diagnostics writes).
- **CI workflow (optional but highly recommended)** – Document planned workflow to match implementation commit.
