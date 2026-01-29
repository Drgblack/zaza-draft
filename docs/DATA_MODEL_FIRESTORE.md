# Firestore Data Model

This document highlights the collections that the Zaza Draft v1 backend reads and writes so the spec checklist can reference concrete data coverage.

## User-scoped collections
- `users/{uid}` is the root document for each teacher/provider. It branches into:
  - `snippets/` — persisted drafts are stored see `app/api/draft/generate/route.ts` and `app/api/snippets/route.ts` for read/write operations.
  - `diagnostics/status` — Chamfered to guard observability; both `/api/draft/generate` and `/api/diagnostics` touch this path to record guard outcomes.
  - `insights/summary` and `usage` shards — `app/api/draft/generate` updates `usage` via `lib/usage.ts`, and entitlements are read through `lib/entitlements.ts`.
  - `rateLimits/{doc}` — `lib/rate-limit.ts` protects abusive traffic.

## Platform collections
- `_health/ping` — pinged by `/api/health/route.ts` to confirm Firestore connectivity.
- `panic_scans/{scanId}` — created by `/api/panic-scan/upload/route.ts`, updated by `/api/panic-scan/[scanId]/analysis/route.ts`, and referenced by `/api/panic-scan/[scanId]/generate-reply/route.ts`.
- `voice_sessions/{sessionId}` — managed at `/api/voice/[voiceSessionId]/route.ts` and the safe rewrite helper; uploads store media metadata inside the same collection.
- `supportTickets` — appended by `lib/support/firestore.ts` when the support widget captures issues.
- `stripeCustomers` and `users/{uid}` billing fields — touched by `/api/billing/checkout/route.ts` and `/api/billing/webhook/route.ts` to reconcile payment state.

For indexes, TTLs, and security rules that cover these paths, refer to `docs/firestore-schema-notes.md`.
