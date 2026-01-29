# Regression Contracts

This index captures the non-negotiable behaviours that the v1 release must preserve forever. Each entry links to the deterministic tests that guard the contract.

- **Trust-grade prohibitions** – `[app/api/draft/generate/route.test.ts](app/api/draft/generate/route.test.ts)` (`trust-grade guard` section) ensures banned phrases in EN/DE are rejected with the documented error shape.
- **Greeting resolution rules** – `[app/api/draft/generate/route.test.ts](app/api/draft/generate/route.test.ts)` (`greeting handoff`, `child name anchoring`) confirms that greetings resolve parent/child names, append fallback signatures, and keep the tone anchored per locale.
- **DE signoff formatting** – the same route tests plus `[lib/draft/signature.test.ts](lib/draft/signature.test.ts)` guard the German comma/closing line rules so signoffs remain correct.
- **Usage-limit payload shape** – `[app/api/draft/generate/route.test.ts](app/api/draft/generate/route.test.ts)` (`usage entitlement parity`) plus `[lib/usage.test.ts](lib/usage.test.ts)` verify the rate-limited response (`RATE_LIMITED`, `USAGE_LIMIT_EXCEEDED`) and the `usage` object (`plan`, `limit`, `remaining`, `currentMonthUsage`, `unlimited`).
- **Snippet persistence requirements** – `[app/api/draft/generate/__tests__/snippet-persistence.test.ts](app/api/draft/generate/__tests__/snippet-persistence.test.ts)` ensures every persisted document carries `requestId`, `contextUsed`, `language`, `usage`, and valid timestamps, mirroring `docs/DATA_MODEL_FIRESTORE.md`.
