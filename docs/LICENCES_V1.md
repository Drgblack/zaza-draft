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
