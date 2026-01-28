# 2026-01-28 Regression Log

## Snippet persistence tests
- **Symptom:** new snippets triggered 422 insufficient input and later 500 because the @/lib/usage mock did not expose getCurrentMonthKey, leaving the Firestore mock incomplete.
- **Fix:** aligned the mock exports and ensured the Firestore write helpers are consistent so the test passes.
- **Verification:** rerun pnpm test:unit and look for the snippet persistence suite to finish without errors.

## German sign-off formatting
- **Symptom:** drafts sometimes emitted mojibake sequences (ï¿½ etc.) and the closing line shifted formatting around Mit freundlichen Grüßen,.
- **Fix:** cleaned the sign-off normaliser to keep the canonical German closing literal, including comma handling, and verified the dedicated tests expect the exact string.
- **Verification:** the draft generation route tests now assert the German closing remains Mit freundlichen Grüßen, and the mojibake pattern is absent.
