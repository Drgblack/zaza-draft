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

## Phase 2b Billing & Analytics

- **Stripe + Firestore**: The free tier remains capped at 10 drafts/month (enforced in `/api/draft/generate`), while paid `Draft Pro` subscribers enjoy unlimited drafts. `/api/account/status` reports the current plan/usage, `/api/billing/checkout` and `/api/billing/portal` drive the client upgrade/manage flows, and `/api/billing/webhook` syncs Stripe events into Firestore (making sure `users/{uid}` stores `stripeCustomerId`, `subscriptionStatus`, `priceId`, `currentPeriodEnd`, `cancelAtPeriodEnd`, and a `stripeCustomers/{customerId}` reverse lookup).
- **Analytics**: Client events (`auth_login_success`, `draft_generate_requested`, `draft_generate_succeeded`, `draft_generate_failed`, `upgrade_clicked`, `manage_subscription_clicked`, `checkout_redirected`) are logged via `lib/analytics`, while the server emits `draft_generation`, `billing_webhook_received`, `checkout_session_created`, `billing_portal_created`, `subscription_status_changed`, and `invoice_event`.

## Phase 3B Persistence & History

- **Firestore persistence:** Every successful generation now saves a document under `users/{uid}/snippets/{snippetId}` with the sanitized prompt, AI output, tone, language, context (subject/grade), word count, model metadata, safety flags, generation timing, and usage snapshot. Sensitive prompts are rejected and never persisted. 
- **New endpoints (auth required):**
  - `GET /api/snippets?limit=20&cursor=...` – paginated list of recent saved drafts, newest first, returns metadata plus `generatedText`.
  - `DELETE /api/snippets/{snippetId}` – removes the snippet for the owning user.
  - `POST /api/draft/generate` now returns `snippetId` on success so the UI can link the latest draft.
- **History UI:** The editor screen renders a “Recent drafts” accordion with the last five snippets, showing timestamp, tone, language, word count, and optional context; each item has “Load” (populates the editor) and “Delete” actions.

### Required environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_DRAFT_PRO` (the price ID for the Draft Pro monthly plan)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (used in success/cancel URLs for Stripe and should match `http://localhost:3000` in dev)

Firebase envs are already listed above in the Phase 2a section and remain required.

### Manual billing test checklist

1. Run `stripe listen --forward-to http://localhost:3000/api/billing/webhook` to forward events locally. Make sure `STRIPE_WEBHOOK_SECRET` matches the webhook signing secret printed by the CLI.
2. Call `POST http://localhost:3000/api/billing/checkout` with a valid Firebase ID token (`Authorization: Bearer <id-token>`) to create a Checkout session, and follow the returned URL to complete payment with test card numbers.
3. After `checkout.session.completed` and related webhook events fire, verify Firestore under `users/{uid}` contains the expected billing fields and `stripeCustomers/{customerId}` maps back to the user.
4. Confirm `/api/account/status` now reports `plan: "pro"` and a null `limit`, and `/api/draft/generate` returns `usage.plan === "pro"` without enforcing the 10-draft cap.
5. Repeat the flow for a free account to ensure the limit is enforced (expect `USAGE_LIMIT_EXCEEDED` once 10 drafts are consumed).

## Phase 3C Real AI generation

- **AI provider configuration**
  - `OPENAI_API_KEY` (required) – the key used by `lib/ai/provider.ts` to call OpenAI.
  - `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`) – swap in GPT-4, GPT-4o, or `gpt-3.5-turbo` for testing.

- **/api/draft/generate contract**
  - The route now hands the sanitized prompt to the real provider and includes the provider metadata when responding.
  - Success responses still include `generatedDraft`, `metadata`, and `usage`, but the metadata now reflects the actual `modelUsed`, `generationTime`, `wordCount`, `safetyFlags`, and the persisted `snippetId`.
  - Errors keep the structured shape (`success: false`, `error.code`, `error.message`, optional `data.redactedPreview`) with the new cases `AI_GENERATION_FAILED` (provider issues or missing API key) plus the existing `INVALID_REQUEST` and `USAGE_LIMIT_EXCEEDED`.

```bash
curl -X POST http://localhost:3000/api/draft/generate \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "situation":"Student needs encouragement around missing homework.",
    "tone":"professional",
    "language":"en",
    "context":{"subject":"Math","gradeLevel":"8"}
  }'
```

```json
{
  "success": true,
  "data": {
    "generatedDraft": "Thank you for being patient with ...",
    "snippetId": "xyz123",
    "metadata": {
      "modelUsed": "gpt-4o-mini",
      "generationTime": 482,
      "wordCount": 74,
      "safetyFlags": []
    }
  },
  "usage": {
    "plan": "free",
    "currentMonthUsage": 3,
    "limit": 10,
    "remaining": 7
  }
}
```

## Firestore snippets schema (Phase 3B / 3C)

- **Collection:** `users/{uid}/snippets/{snippetId}` (write only for successful generations).
- **Fields per document:**
  - `situation` (sanitized prompt, omitted when the input was rejected for PII).
  - `generatedDraft`, `tone`, `language`.
  - `contextUsed`: `{ subject?: string, gradeLevel?: string }`.
  - `wordCount`, `modelUsed`, `generationTime` (ms).
  - `safetyFlags`: array of strings describing any PII redaction or policy hits.
  - `usage`: `{ currentMonthUsage, limit, remaining }`.
  - `createdAt`, `updatedAt`.
- **Persistence rules:** The API refrains from storing drafts when input fails safety; every successful generation writes the snippet and returns the Firestore `snippetId`.

## How to test locally

1. Provision `.env.local` with the Firebase keys listed above plus `OPENAI_API_KEY` (and `OPENAI_MODEL` if you want to control the provider).
2. Sign in via the app or emulator to obtain a Firebase ID token and use it in the `Authorization: Bearer <id-token>` header.
3. Run the `curl` example under Phase 3C to exercise `/api/draft/generate` and confirm the structured success payload, including `snippetId`.
4. Fetch history with `GET /api/snippets?limit=5` and delete an entry via `DELETE /api/snippets/{snippetId}`; both endpoints reuse the same auth guard and rely on Firestore `createdAt` ordering.

## Phase 3D Safety, rate limiting & Firestore rules

- **Server-side rate limiting:** Each uid may call `/api/draft/generate` at most 10 times per 10 minutes. The backend tracks counters in `users/{uid}/rateLimits/draftGenerate` (`windowStart`, `count`) and returns `RATE_LIMITED` (429) with a friendly retry note when the window is exceeded.
- **Safety logging:** `/api/draft/generate` emits structured server logs (`[draft] generate outcome`) capturing a hashed uid, tone, language, latency, model/tokens, and the outcome code (`SUCCESS`, `RATE_LIMITED`, `AI_GENERATION_FAILED`, etc.), without logging any raw teacher input or AI output.
- **Firestore schema/security notes:**
  - `users/{uid}/snippets/{snippetId}` is ordered by `createdAt` (used for pagination) and must be readable/writable only by `request.auth.uid == uid`.
  - `users/{uid}/monthlyUsage` and the new `rateLimits/draftGenerate` doc are maintained exclusively by trusted server code, never directly by the client.
  - Indexes: Firestore already indexes `createdAt` within the `snippets` subcollection, ensuring the `GET /api/snippets` pagination (order by `createdAt desc`) works without extra composite indexes.
