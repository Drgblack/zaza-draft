# Regressions - Notes

## 2026-01-28 - Snippet persistence + DE signoff

### What broke
- Snippet persistence test failed because the test payload was getting rejected as insufficient input (422), and later because the `@/lib/usage` mock was missing required exports (`getCurrentMonthKey`), causing a 500.

### What we fixed
- Stabilised `app/api/draft/generate/__tests__/snippet-persistence.test.ts` by ensuring the `@/lib/usage` mock exports match what the route expects.
- Fixed German closing line encoding (mojibake) and ensured the signoff formatting expectation is consistent (comma handling).

### How to verify
- `pnpm -s test` (or `pnpm -s exec vitest run`)
- Confirm a DE draft includes `Mit freundlichen Grüßen` and formatting is stable.
