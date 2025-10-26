# ADR-001 - Architecture for Zaza Draft (v1)

Status: Proposed
Date: YYYY-MM-DD
Owner: Greg

## Context
Zaza Draft helps teachers write authentic, emotionally intelligent comments and parent messages quickly with school-ready safeguards. We need a simple, safe, and fast architecture that supports i18n (EN/DE), explainability, and basic AI features, while keeping ops overhead low.

## Goals
- Ship a stable v1 web app with fast response and low cognitive load
- Strong i18n coverage (EN default, DE required for public pages)
- Safety layer to reduce risky outputs and provide short "why this" explainers
- Small, testable modules and a minimal dependency graph
- Private by default: no leaking PII, safe logging

## Non-goals (v1)
- Realtime collaboration
- Complex role/permissions
- Heavy analytics or user tracking
- Vendor lock-in migrations

## High-level architecture (proposed)
- Frontend: Next.js (App Router) + TypeScript
- i18n: lightweight key-value translations with locale helpers (EN/DE)
- Styling: Tailwind or CSS Modules (accessibility-first)
- API: Next.js Route Handlers for simple server endpoints
- AI: server-side invocation via provider SDK; add a safety wrapper before responses reach UI
- Storage: start file-based/ephemeral for configs; introduce cloud DB later if needed
- Config/Secrets: environment variables via .env (never commit)
- Testing: Vitest + React Testing Library
- CI: minimal lint/build/test on PR

[Browser] ----> [Next.js App Router (SSR/ISR)] ----> [API Routes]
                    |                                     |
                    v                                     v
               [i18n helpers]                     [AI Provider SDK]
                    |                                     |
                    v                                     v
               [UI components] <----- [Safety Layer] <----|

## Key modules
- app/*: route segments and UI
- lib/i18n/*: locale detection, formatting, t() helpers
- lib/safety/*: prompt templates, content filters, redaction, "why this" explainer
- lib/ai/*: provider client, retry/backoff, timeouts
- lib/validation/*: zod/yup schemas for inputs/outputs
- __tests__/*: unit and light integration tests

## Data flow (simplified)
1. User enters prompt -> UI validates -> API route validates again.
2. API calls AI with safety prompts and guardrails.
3. Safety layer post-processes outputs (redact, classify, block if needed) and attaches a short "why this" note.
4. Response returned to UI -> rendered with locale-aware formatting.

## i18n rules
- All user-facing strings come from translation keys.
- Provide EN and DE for public pages and critical flows.
- No hardcoded text in components.

## Security & privacy
- No secrets in the client bundle.
- Never log PII or full prompts by default; use redaction.
- Enforce input validation on every API route.
- Reasonable rate limiting for mutation routes (phase 2 if needed).

## Error handling
- Developer-friendly messages in dev; user-friendly in prod.
- Clear retry guidance and copy for blocked/sensitive requests.
- Centralised error util for API routes.

## Observability (lightweight)
- Basic server logs for errors (sanitised).
- Hook for adding structured logs/telemetry later.

## Performance
- Stream responses where appropriate.
- Lazy-load heavy components.
- Keep dependency count low; avoid blocking work in the UI.

## Dependencies (initial)
- next, react, typescript, eslint, prettier, vitest, @testing-library/react
- (Optional) zod for validation, tailwindcss or CSS Modules for styling

## Rollout plan
- Phase 1: Scaffold, i18n shell, safety wrapper, one core flow.
- Phase 2: Tests, DE copy for public pages, polish.
- Phase 3: Add minimal analytics flag, rate limiting if needed.

## Risks & mitigations
- AI variability: deterministic settings + post-processing -> safer outputs.
- i18n gaps: translation audit in PR checklist.
- Scope creep: ADR-driven changes; keep PRs small.

## Decision
Adopt the Next.js App Router + server-side AI call + safety wrapper approach for a small, maintainable v1 that meets i18n and trust requirements with minimal ops.

## Consequences
- Faster time-to-value with a simple stack.
- Some future refactors if we later add multi-tenant auth or heavy persistence.
- Clear seams for swapping AI providers or adding a DB.
