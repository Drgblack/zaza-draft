# Zaza Draft App (Post-v0)

## Phase 1 API

- **Endpoint:** `POST /api/draft/generate`
- **Payload:** user prompt (`situation`), chosen `tone`, `language` (`en`/`de`), and optional `context` (`subject`, `gradeLevel`).
- **Response:** `generatedDraft` text, `metadata` (tone, language, placeholder model, timing, word count, safety flags, timestamps, used context), and `usage` (current month count, limit, remaining). Errors contain `success: false`, `error.code`, `error.message`, and a `data.redactedPreview` if sensitive data was stripped.
- **Safety assumptions:** input is rejected if it contains detectable emails, phone numbers, or street addresses; users are reminded not to submit student full names or private identifiers; metadata flags `safetyFlags` for downstream logging.
- **Temporary notes:** AI provider calls are still placeholder drafts, but auth and usage now rely on Firebase (see below).

## Firebase configuration (Phase 2a)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)
- `FIREBASE_SERVICE_ACCOUNT_KEY` – JSON string with the service account credential (used by the admin SDK to verify tokens and manage Firestore). Example: `cat service-account.json | jq -c . | pbcopy`.

The client now uses Firebase Auth (email/password + Google) and surface the support email `greg@zazatechnologies.com` on the login screen. Every request to `/api/draft/generate` must include `Authorization: Bearer <id-token>`; the server verifies the token and enforces the 10-draft/month free tier in Firestore (`users/{uid}.monthlyUsage`).

For more details, see `docs/spec/Zaza Draft - Technical Specification.md`.
