# Firestore Rules v1

The v1 release keeps Firestore access tightly scoped: all authenticated traffic flows through the server (Next.js routes and Cloud Functions) plus the Firebase Admin SDK. There are no direct client reads or writes. The existing `firestore.rules` file locks the database down entirely, which matches the production posture below.

## Intended client access policy
- **Client writes:** none. Every write happens through server routes (`/api/draft/generate`, `/api/panic-scan`, etc.) that use the Admin SDK.
- **Client reads:** none. Client UI does not read Firestore documents directly; it relies on server responses.
- **Server-only paths:** `users/{uid}`, `users/{uid}/snippets/{requestId}`, `users/{uid}/usage`, `_health/ping`, `panic_scans/{scanId}`, `voice_sessions/{sessionId}`, `supportTickets/{ticketId}`, `stripeCustomers/{customerId}`.

## Example rules behaviour
- `match /{document=**}` denies reads/writes when evaluated from a client SDK; server Admin requests are not subject to these rules.
- If a future client route appears, add a scoped `match` clause that checks `request.auth.uid` and mirrors the documented fields (see `docs/DATA_MODEL_FIRESTORE.md`).

## Rationale
Keeping rules locked to `allow false` forces all access through the vetted backend routes, which already enforce usage limits, trust-grade votes, and diagnostics updates. This also keeps EN/DE parity unaffected since no language-specific reads occur.
