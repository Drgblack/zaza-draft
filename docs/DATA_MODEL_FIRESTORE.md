# Firestore Data Model

This document summarises the concrete Firestore paths that the v1 backend writes and reads. It is the reference for the “Snippet persistence + data integrity” pillar so the behaviour can be proven in code/tests and the storage schema matches reality.

## User-scoped collections

- **`users/{uid}`** – root document for each authenticated teacher or counselor. The runtime merges lightweight metadata such as `lastDiagnosticsRunAt` plus the transactional `monthlyUsage` shard that stores:
  - `month` (UTC year-month, e.g., `2025-01`)
  - `generationCount`
  - `lastReset` (ISO timestamp)

- **`users/{uid}/snippets/{requestId}`** – writes from `/api/draft/generate/route.ts`, keyed by the draft request ID. Each document records:
  - `generatedText` (the final draft)
  - `tone`, `language`, `mode`, `pronounPreference`
  - `pronounResolution` object (resolved preference, reason, source)
  - `contextUsed` metadata (always carries `requestId`; `subject` is only there when the payload supplies one)
  - `wordCount`, `modelUsed`, `inputReframed`, `inputReframedTier`
  - `safetyFlags` (e.g., `["no-sensitive-content"]`)
  - `latencyMs`, `generationTime`, `signatureBlock`
  - `usage` (same shape returned by `lib/usage.buildUsageResponse`: `plan`, `currentMonthUsage`, `limit`, `remaining`, `unlimited`)
  - `createdAt` (ISO timestamp when the snippet was persisted)
  - `requestId` (mirrors the document ID so audits can tie API timing to Firestore writes)

  The persistence logic is language-agnostic, so the fields above populate regardless of `language` or `uiLocale`. The `contextUsed` umbrella helps downstream observability safely host `requestId` without leaking student or subject text when it is not provided.

- **`users/{uid}/diagnostics/status`** – touched when a snippet saves. The document stores:
  - `lastModelUsed`, `lastPronounPreference`, `lastResolvedPronounPreference`
  - `lastPronounResolutionReason`, `lastPronounResolutionSource`
  - `lastInputReframed`, `lastInputReframedTier`, `lastErrorCode`
  - `lastUsage` (the same object shared with the snippet payload)
  - `lastRunAt` (set via `FieldValue.serverTimestamp()`)

- **`users/{uid}/insights/summary`** – merged from `/api/draft/generate`. The route increments `draftsCreated` and sets `lastDraftAt` using `FieldValue.serverTimestamp()` so metrics reflect the number of persisted drafts.

- **`users/{uid}/rateLimits/{doc}`** – `lib/rate-limit.ts` writes quick counters/TTL documents to enforce per-user rate limiting. The helper does not add new fields to `snippets`, but this real-time guard ensures the snippet data remains credible under heavy load.

## Platform-level collections

- `_health/ping` – `/api/health/route.ts` issues a lightweight read to confirm Firestore connectivity.
- `panic_scans/{scanId}` – the panic-scan upload/analysis routes create and update this document.
- `voice_sessions/{sessionId}` – the voice assistant routes store transcripts and metadata here.
- `supportTickets/{ticketId}` – populated by `lib/support/firestore.ts` when the support widget captures issues.
- `stripeCustomers/{customerId}` – used by the billing handlers for reverse lookups and syncing Stripe events.

## Required indexes (if any)

The collection usage is keyed by document paths (e.g., `users/{uid}`, `users/{uid}/snippets/{requestId}`) and there are no compound queries yet. No composite indexes are required for these patterns at v1.

## Security rules expectations

The repository contains `firestore.rules`, but it currently denies all reads/writes by default. Until the security team authors explicit rules, the production rollout must either swap in permissive rules during deployment or keep the app behind a service account that can write on behalf of `users/{uid}`. Future work should replace the placeholder with rules that:
  - allow authenticated users to read/write their own `users/{uid}` document and subcollections (`snippets`, `diagnostics`, `insights`, `rateLimits`)
  - allow the backend service account to update `_health`, `panic_scans`, `voice_sessions`, `supportTickets`, and `stripeCustomers`
  - reject multi-tenant cross writes

Because no explicit rule set is deployed yet, we mark this expectation as **Deferred** until the first security rules version codifies the access patterns above.
