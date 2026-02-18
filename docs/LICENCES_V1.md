# Free licences v1 workflow

Zaza Draft v1 keeps licences gated behind server-only tooling that the admin/QA team controls. The following patterns describe how to grant, refresh, and revoke access for teachers.

## Single-user workflow
- Ask the teacher to sign up or log in so you can capture their Firebase UID.
- Call POST /api/admin/licences/grant with the admin token (see admin auth notes below) and { type: \ uid\, uid, plan: \pro\, expiresAt?, reason? }.
- The route stores an entitlements object in users/{uid} with planOverride: \pro\, optional expiry, and a timestamped reason.
- Use /api/admin/licences/revoke with { type: \uid\, uid } to reset the override (it nulls the override fields while keeping the doc).

## School-by-domain workflow
- Document the email domain (for example school.edu) you want to unlock.
- Admins call POST /api/admin/licences/grant with { type: \domain\, domain, plan: \pro\, expiresAt?, reason? }.
- The route writes a schoolLicences/{domain} document with the license metadata and timestamps.
- Any teacher whose verified email ends with that domain automatically receives the same pro entitlement while the document is active.
- To remove the licence, call POST /api/admin/licences/revoke with { type: \domain\, domain } and the document will be deleted.

## Security notes
- All Firestore rules remain locked to allow read, write: if false; every operation happens through the Admin SDK inside these admin routes or the existing draft/usage APIs.
- Admin routes require a Firebase ID token and the UID must be listed in INTERNAL_ADMIN_UIDS (QA UIDs and dev bypass headers cannot reach these endpoints).
- Every licence change is logged via Firestore writes (entitlements on users, or schoolLicences documents) and can be audited with the same tools that monitor draft persistence.

## Zaza ID & Licences integration (Draft front door)
- Endpoint: `GET {ZID_BASE_URL}/api/entitlements/resolve-self?productKey=draft` with `Authorization: Bearer <Firebase ID token>` (falls back to `ZID_SERVICE_BEARER_TOKEN` for service-to-service calls if provided).
- Behaviour: `getDraftEntitlement()` fails closed on any error/invalid response; `hasAccess=false` forces the app into the free tier and returns `ENTITLEMENT_REQUIRED` from export routes.
- Caching: session-scoped in-memory cache keyed by `userId+productKey`, TTL 60s; if `expiresAt` is within 10 minutes, TTL shortens to 15s to force early re-check. Expired entitlements are treated as deny with a short TTL.
- Coverage: generation uses ZID-backed plan mapping (pro vs free) for usage limits; PDF/DOCX exports are gated by the same entitlement and respond with a calm upgrade message when blocked.
- Evidence/tests: `tests/zid/client.test.ts` (allow/deny/error, cache, near-expiry TTL), `lib/entitlements.test.ts` (plan mapping + QA), `app/api/draft/generate/route.test.ts` (usage errors), export routes exercised via `components/draft-output` upgrade messaging.
- Env vars: `ZID_BASE_URL` (required), `ZID_SERVICE_BEARER_TOKEN` (optional service bearer).
