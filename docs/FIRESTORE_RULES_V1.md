# Firestore Rules v1

The v1 release keeps Firestore access tightly scoped: all authenticated traffic flows through the server (Next.js routes and Cloud Functions) plus the Firebase Admin SDK. There are no direct client reads or writes. The `firestore.rules` file now enforces the scoped paths described below.

## Intended client access policy
- **Client writes:** none. Every write happens through server routes (`/api/draft/generate`, `/api/panic-scan`, `/api/admin/licences/*`, etc.) that use the Admin SDK.
- **Client reads:** restricted to authenticated users reading only their own documents.
- **Server-only paths:** `users/{uid}`, `users/{uid}/snippets/{snippetId}`, `users/{uid}/classes/{classId}` (reserved), `subscriptions/{subscriptionId}` (read-only), plus all other collections (`usage`, diagnostics, panic scan, etc.) which continue to be server-only.

## Example rules behaviour
- `match /users/{userId}` and `match /users/{userId}/snippets/{snippetId}` permit clients to interact only with their own metadata and generated snippets.
- `match /users/{userId}/classes/{classId}` is kept for parity with the spec while no client surface consumes it.
- `match /subscriptions/{subscriptionId}` allows authenticated owners to read their subscription while disallowing writes from the client.
- `match /{document=**}` denies any other read/write combination from the client SDK; the Admin SDK bypasses them entirely.

## Rationale
These scoped rules enforce the “server-only write” posture described in `docs/spec/Zaza Draft - Technical Specification.md`: clients can read their own profile, snippets, and limited subscription metadata, and all other operations remain blocked. Sensitive plan/usage data, diagnostics, panic scans, and licence documents stay behind the Admin SDK.

## Testing posture
There is no Firestore rules test harness in this repo yet, so adding one would be a sizable investment for v1. Instead, we rely on the scoped rule set and the enforced server-only access paths above; any future need for automated rules tests should re-use `@firebase/rules-unit-testing` when additional client SDK interactions appear.
