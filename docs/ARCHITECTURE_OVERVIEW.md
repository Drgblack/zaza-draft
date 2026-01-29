# Architecture Overview

This note summarizes the live topology for Zaza Draft and the flows that keep the `/api/draft/generate` experience resilient, multilingual, and observable.

## Key components
- **Next.js API routes** run on Vercel (`/app/api`). The draft surface is handled entirely inside `/api/draft/generate/route.ts`, which serializes teacher input, the mocked LLM provider, trust-grade enforcement, pronoun rules, snippet persistence, and final greetings into a single response payload.
- **Auxiliary routes** include `/api/panic-scan` (upload, analysis, reply generation), `/api/diagnostics`, `/api/health`, and billing endpoints (`/api/billing/*`), all of which share the Firebase Admin client from `lib/firebase/admin.ts`.
- **AI provider layer** uses `lib/ai/provider.ts` plus the pronoun helpers in `lib/text/pronouns.ts` to embed system instructions that enforce Appendix F, pronoun consistency, and paraphrase stability before the draft is returned.

## Data flows and resilience
- **Draft generation** starts by reading user/diagnostics/insights documents in Firestore, sending structured prompts to the mocked LLM, persisting snippets, and then applying the trust-grade guard that rejects banned phrases for both English and German locales (`app/api/draft/generate/route.ts` and `app/api/draft/generate/route.test.ts`).
- **Never-fail guardrails** include fallback greeting resolution, snippet persistence even when subjects are missing, and deterministic pronoun enforcement from `lib/text/pronouns.ts`; any trust violation is surfaced as a structured `TRUST_GRADE_VIOLATION` error and logged by `lib/diagnostics`.
- **Observability** is tiered: `/api/diagnostics` exposes Firestore-stored `diagnostics/status`, while `app/api/health/route.ts` verifies Firestore connectivity through `_health/ping`. All services log the debug payload described in `docs/QA.md` for later pairing with reproduction steps.

## Deployment and tooling
- Zaza Draft relies on `pnpm -s test:unit` (see `package.json`) for CI, Vercel for serverless hosting, and `docs/env-parsing.md` plus `.env.*` examples to manage environment variables. Monitoring is provided by the same Vercel log streams that Surface request IDs from the panic scan logs in `app/api/panic-scan/upload/route.ts`.

