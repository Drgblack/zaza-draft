# Launch Freeze Guidelines

## Frozen contracts for v1.0
- **`/api/draft/generate` contract** – the route must continue accepting the current payload (situation, tone, uiLocale, optional pronoun/subject metadata) and return the documented response shape (`success`, `generatedDraft`, `usage`, `trustGrade`, etc.) without introducing new required fields. The contract is verified by `app/api/draft/generate/route.test.ts`.
- **Trust-grade violation schema** – any rejected draft must still signal `outcome: "INVALID_REQUEST"`, use `errorCode: "TRUST_GRADE_VIOLATION"`, and keep the localized trust-grade explanation fields per Appendix F. These values are enforced in the same route tests.
- **Panic Scan error codes** – the panic scan upload/analysis routes must keep returning structured JSON with the documented `status` and `code` fields when OCR fails, the path is rejected, or the analysis pipeline errors. Refer to `app/api/panic-scan/upload/route.test.ts` and `docs/qa/PANIC_SCAN_QA.md`.
- **Usage limit response structure** – usage guards must continue returning the `RATE_LIMITED` outcome and include the localized limit message defined by the usage entitlement tests in `app/api/draft/generate/route.test.ts`. The payload must still expose `usage` details (`plan`, `currentMonthUsage`, `limit`, `remaining`, `unlimited`) for downstream clients.
- **Greeting and signature rules** – greeting resolution must keep anchoring parent/child names and appending teacher signatures as described in the tests under `app/api/draft/generate/route.test.ts`, including the German signoff formatting and fallback when `signatureBlock` is missing.

## Changes that require tests before merge
- Any user-facing behaviour touched in `/api/draft/generate`, `/api/panic-scan`, or the usage tracking helpers must include deterministic EN/DE tests that validate the existing contracts.
- Any modification to the trust-grade filter list, usage response shape, or greeting/signoff formatting must be captured by the corresponding tests before the merge.

## Areas allowed to evolve freely
- Internal refactors that do not change response shapes (e.g., renaming helpers inside `lib/usage.ts`) provided the existing tests continue to pass.
- Developer-only tooling (QA helpers, debugging flags) that stay behind gated feature flags and do not influence production behaviour.
