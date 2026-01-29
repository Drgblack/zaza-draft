# 100% EN/DE Parity Completion Checklist

This document tracks the pillars that must reach full parity before we can claim the boutique, trust-first promise for both English and German teachers. Appendix F (docs/spec/Zaza Draft - Technical Specification - Appendix F-Trust-Grade.md) is the contract for Pillars 1 and 2 and is referenced explicitly below.

## Pillar 1: Core drafting experience
- Definition of done: every draft honors the UI locale for language, respects greeting/sign-off anchors, and carries context specificity (parent/child names, subject, grade, next steps) in both EN-GB and DE-DE outputs.
- Parity checks: confirm resolveOutputLanguage/canonicalizeLocaleIdentifier use the UI locale for EN vs DE; verify fallback templates exist for both languages; assert signature/closing handling matches expectations (Kind regards vs Mit freundlichen Grüßen,).
- Test coverage: app/api/draft/generate/route.test.ts (greeting handoff, closing/signature, repeated paragraphs); lib/draft/fallback.test.ts (student name insertion); lib/draft/language.test.ts (locale normalization).
- Remaining manual QA: compare actual EN/DE drafts for identical inputs in the manual QA plan once Trust-Grade guard is fully enforced.

## Pillar 2: Safety + Trust-Grade (Appendix F)
- Definition of done: all Appendix F behaviours (language locks, rhetorical anchors, specificity guardrails, professional boundaries, moral judgement ban, no fabrication, no meta-instructions) pass deterministic, table-driven coverage for EN and DE, and the generation pipeline surfaces structured trust-grade validation errors when violations occur.
- Parity checks: Appendix F §1-§7.1 lists the rules; we map them to tests below.
- Test coverage: app/api/draft/generate/route.test.ts now includes EN/DE trust-grade guard fixtures and de-escalation summary expectations, while the new trust-grade detector in app/api/draft/generate/route.ts raises structured TRUST_GRADE_VIOLATION responses. Appendix F references: language lock (§5), moral judgement (§4), no fabrication (§3), meta-instruction (§6), anti-generic wording (§2), and de-escalation guidance (§7).
- Remaining manual QA: seed real-world prompts (see docs/qa once ready) to ensure the error message surfaces consistently in both languages.

## Pillar 3: Panic Scan
- Definition of done: OCR and upload endpoints return EN/DE copy parity for success and failure scenarios, Chrome noise is filtered, suspicious paths rejected, and manual QA script exists.
- Parity checks: verify app/api/panic-scan/upload/route.test.ts covers structured errors; augment once addl copy parity tests exist.
- Test coverage: app/api/panic-scan/upload/route.test.ts and lib/panic-scan/clean-ocr.test.ts.
- Remaining manual QA: write docs/qa/PANIC_SCAN_QA.md with device steps (pending PR2).

## Pillar 4: Accounts/Entitlements/Usage
- Definition of done: free-plan limits, pro entitlements, and usage reporting produce consistent EN/DE messages; entitlements triggered by getCurrentMonthKey; the experience surfaces rate-limit copy/structured errors.
- Parity checks: confirm lib/usage.test.ts and app/api/draft/generate/route.test.ts stay aligned (including usage payload). Document school free-license status.
- Test coverage: app/api/draft/generate/route.test.ts (rate limit, dev bypass); lib/usage.test.ts; lib/auth/internal-qa.test.ts.
- Remaining manual QA: add structured EN/DE usage limit tests via API clients (PR3).

## Pillar 5: Snippet persistence + data integrity
- Definition of done: Firestore snippets persist identically for EN/DE drafts and include metadata/word counts; any schema/index/rule updates live in docs.
- Parity checks: app/api/draft/generate/__tests__/snippet-persistence.test.ts already covers snippet writes; docs/firestore-schema-notes.md should reflect collections.
- Test coverage: snippet persistence test; app/api/draft/generate/route.test.ts metadata assertions.
- Remaining manual QA: compare snippet snapshots across locales and confirm schema doc matches Firestore rules (PR4).

## Pillar 6: Observability/Diagnostics/Ops
- Definition of done: rate-limit/usage/safety logs stay gated, diagnostics writes happen, deescalationSummary and safety flags reported for both languages.
- Parity checks: DEBUG_DRAFT_LOGS gating already ensures logs do not spam tests; components/main-editor.tsx consumes identical summary payloads for EN/DE.
- Test coverage: app/api/draft/generate/route.test.ts (metadata, safety flags), lib/deescalation/__tests__/detect.test.ts and components/__tests__/deescalation-banner.test.tsx.
- Remaining manual QA: monitor staging diagnostics dashboard to confirm parity (awaiting PR5 additions).

## Pillar 7: Deployment/Release hygiene
- Definition of done: release checklist documents preview vs production env var parity, Vercel checks, and staged release steps.
- Parity checks: release doc should highlight identical env var expectations for EN/DE features (none). Logging and observability gating should remain symmetric.
- Test coverage: none (documentation only).
- Remaining manual QA: finalize docs/RELEASE_CHECKLIST.md with preview vs production steps (PR5).

## Appendix F Mapping Notes (Pillars 1+2)
1. Language locking: app/api/draft/generate/route.test.ts ensures resolveOutputLanguage honors UI locale and generateDraftWithFallback receives the locale-specific context.
2. Parent/child anchoring: lib/draft/fallback.ts and the new child-name anchoring tests confirm the context provides names for EN/DE; app/api/draft/generate/route.ts keeps greeting/sign-off anchors.
3. Safety constraints (moral judgement, no fabrication, no meta instructions, absolute promises): the new trust-grade detector enforces these with structured violations that routes surface via TRUST_GRADE_VIOLATION errors.
4. De-escalation summary: app/api/draft/generate/route.ts always writes deescalationSummary from rewrite results; tests ensure both languages see the coaching line and flagged phrases.
5. Anti-generic behaviour: existing tests for anchor paragraphs plus the trust-grade guard (which rejects bland/generic language) fulfill the specificity contract.
