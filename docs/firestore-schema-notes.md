# Firestore Schema Notes - Indexes + Security Rules Design (Phase 3.7)

Constraints
- Documentation only.
- No runtime code changes.
- No API routes, functions, UI, or firestore.rules implementation in this phase.

## A) Collections overview
Planned collections:
- users
- contacts
- campaigns
- conversations
- messages
- approvals
- scrape_jobs
- scrape_results
- audit_logs

Assumption: Multi-tenant scoping via workspaceId on every document (except login or public marketing pages, not represented in Firestore).

## B) Collection details

### users
Primary key strategy
- docId: uid (Firebase Auth UID)
Required fields
- uid (string)
- workspaceId (string)
- email (string)
- roles (array of strings, e.g., ["admin"])
- createdAt (timestamp)
- updatedAt (timestamp)

Common query patterns
- Get current user by uid
- List users in workspace (admin UI)

Proposed composite indexes
- users: workspaceId ASC, createdAt DESC

### contacts
Primary key strategy
- docId: deterministic contactId (e.g., hash or stable slug) or Firestore autoId (choose one, prefer deterministic if dedupe matters)
Required fields
- workspaceId (string)
- contactId (string, if deterministic id is used)
- platform (string: tiktok|youtube|instagram|other)
- handle (string)
- displayName (string)
- status (string, e.g., active|archived)
- tags (array)
- createdAt (timestamp)
- updatedAt (timestamp)

Common query patterns
- List contacts by workspace, newest first
- Filter by platform
- Filter by status
- Search by handle/displayName (note: Firestore prefix search needs dedicated fields or external search)

Proposed composite indexes
- contacts: workspaceId ASC, createdAt DESC
- contacts: workspaceId ASC, platform ASC, createdAt DESC
- contacts: workspaceId ASC, status ASC, createdAt DESC

### campaigns
Primary key strategy
- docId: campaignId (autoId OK)
Required fields
- workspaceId
- name
- status (draft|active|paused|completed)
- createdAt
- updatedAt

Common query patterns
- List campaigns by status
- Sort by updatedAt desc

Proposed composite indexes
- campaigns: workspaceId ASC, updatedAt DESC
- campaigns: workspaceId ASC, status ASC, updatedAt DESC

### conversations
Primary key strategy
- docId: conversationId (autoId OK)
Required fields
- workspaceId
- contactId
- channel (email|dm|comment|other)
- status (open|waiting|closed)
- lastMessageAt (timestamp)
- createdAt
- updatedAt

Common query patterns
- List conversations for a contact
- Inbox view: conversations by status, ordered by lastMessageAt desc

Proposed composite indexes
- conversations: workspaceId ASC, lastMessageAt DESC
- conversations: workspaceId ASC, status ASC, lastMessageAt DESC
- conversations: workspaceId ASC, contactId ASC, lastMessageAt DESC

### messages
Primary key strategy
- docId: messageId (autoId OK)
Required fields
- workspaceId
- conversationId
- direction (in|out)
- body (string)
- sentAt (timestamp)
- createdAt (timestamp)

Common query patterns
- List messages by conversationId ordered by sentAt asc

Proposed composite indexes
- messages: workspaceId ASC, conversationId ASC, sentAt ASC

### approvals
Primary key strategy
- docId: approvalId (autoId OK)
Required fields
- workspaceId
- entityType (campaign|message|other)
- entityId
- state (pending|approved|rejected)
- createdAt
- updatedAt
- decidedAt (timestamp, optional)

Common query patterns
- List pending approvals
- List approvals by entityType

Proposed composite indexes
- approvals: workspaceId ASC, state ASC, createdAt DESC
- approvals: workspaceId ASC, entityType ASC, createdAt DESC

### scrape_jobs
Primary key strategy
- docId: jobId (autoId OK, dedupeKey optional for idempotency)
Required fields
- workspaceId
- type
- status (queued|running|done|failed)
- dedupeKey (string, optional)
- nextRunAt (timestamp, optional)
- leaseExpiresAt (timestamp, optional)
- attemptCount (number)
- maxAttempts (number)
- createdAt
- updatedAt

Common query patterns
- Worker claims jobs by status + nextRunAt
- Admin monitoring of failures

Proposed composite indexes
- scrape_jobs: workspaceId ASC, status ASC, nextRunAt ASC
- scrape_jobs: workspaceId ASC, status ASC, updatedAt DESC

### scrape_results
Primary key strategy
- docId: resultId (autoId OK)
Required fields
- workspaceId
- jobId
- contactId (optional)
- captureId (optional)
- status (ok|partial|failed)
- createdAt

Common query patterns
- List results for a jobId
- List results for a contactId ordered by createdAt desc

Proposed composite indexes
- scrape_results: workspaceId ASC, jobId ASC, createdAt DESC
- scrape_results: workspaceId ASC, contactId ASC, createdAt DESC

### audit_logs
Primary key strategy
- docId: auditId (autoId OK)
Required fields
- workspaceId
- actorUid
- action (string)
- entityType (string)
- entityId (string)
- createdAt
- meta (map, optional)

Common query patterns
- List audit logs for workspace ordered by createdAt desc
- Filter by actorUid
- Filter by entityType

Proposed composite indexes
- audit_logs: workspaceId ASC, createdAt DESC
- audit_logs: workspaceId ASC, actorUid ASC, createdAt DESC
- audit_logs: workspaceId ASC, entityType ASC, createdAt DESC

## C) Security rules model (high-level)

Principles
- Auth required for everything except /login (and any public pages not backed by Firestore).
- Workspace scoping: request.auth.uid must belong to the same workspaceId as the target document.
- Role-based access for admin-only operations.

High-level rule model
- users
  - read: user can read their own uid doc; admin can read all users in workspace
  - write: user can update limited profile fields; admin can manage roles (if allowed)
- contacts, campaigns, conversations, messages
  - read/write: allowed if workspaceId matches the caller's workspace
  - delete: optional, prefer soft delete via status = archived
- approvals
  - read: workspace members
  - write: admin-only for state transitions (approve/reject)
- audit_logs
  - append-only: create allowed (system or user actions), updates and deletes denied
- scrape_jobs, scrape_results
  - Phase 5+: write restricted to worker/service roles
  - Phase 3/4: may allow admin write for testing, but document as temporary

## D) Phase 4 wiring assumptions (CRUD endpoints)

Expected endpoints will need:
- Workspace-aware list endpoints (workspaceId filter always applied server-side)
- Deterministic query shapes that match indexes listed above
- Pagination patterns (createdAt/updatedAt cursors)
- Admin-only transitions:
  - approvals: approve/reject
  - monitoring/admin actions: restricted, audited
- Worker flows (Phase 5+):
  - scrape_jobs claim/lease extend/complete
  - scrape_results write-back

Notes
- Any UI filters that combine multiple where clauses + orderBy will require composite indexes.
- Prefer a small set of well-defined query patterns to keep index count under control.
