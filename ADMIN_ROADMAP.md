# Zaza Draft Admin Roadmap

## Status
- Phase 1 (search/filter/sort/pagination/plan management): COMPLETE
- Phase 2 (school licences/seat management/member assignment): COMPLETE
- Phase 3 (bulk operations): PENDING
- Phase 4 (analytics by school/Stripe integration): PENDING

## Phase 3 — Bulk Operations
Build when: first school licence deal is in progress

Features:
- Invite links with codes (invites/{inviteCode} collection 
  already scaffolded in data model)
- Domain-based auto-assignment (user signs up with 
  @school.edu → auto-assigned to matching licence)
- CSV import of email list → bulk assign to licence
- school_admin role activation with scoped dashboard 
  (can see only their school's usage signals)

API routes needed:
- POST /api/admin/invites (create invite link/code)
- POST /api/admin/users/bulk-assign (domain or email list)
- GET /api/admin/invites (list active invites)
- DELETE /api/admin/invites/:code (revoke invite)

UI pages needed:
- /admin/invites (new page)
- school_admin scoped view of /admin/analytics 
  filtered by schoolId

Data model already exists:
- invites/{inviteCode} — defined in planning doc
- schoolId in ZazaSignal — scaffolded, needs populating
- school_admin role — exists in roles.ts, not yet active

Dependencies before building:
- At least one real school licence in production
- school_admin user to test scoped dashboard with

## Phase 4 — Analytics and Stripe Integration
Build when: 3+ school licences active

Features:
- Usage analytics per school (drafts, signals, 
  engagement by schoolId)
- CSV export per school/district
- Stripe customer ID linkage to school licence
- Licence renewal flow
- Seat expansion flow

## Firebase Project Note
Production project: zaza-draft-app
Legacy/licensing project: zaza-id-and-licences
See FIREBASE_PROJECTS.md for full decision record.
All admin scripts must target zaza-draft-app.
Use: npx tsx scripts/set-super-admin.ts --uid=UID 
     --role=ROLE (after loading zaza-draft service account)
