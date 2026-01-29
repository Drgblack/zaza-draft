# Launch Smoke Tests (EN/DE)

Run these steps twice, once with `uiLocale: en-GB` and once with `uiLocale: de-DE`. Keep the payload structure identical except for the locale and any localized copy verification.

1. **Standard draft generation**
   - POST `/api/draft/generate` with `situation` mentioning the child name (e.g., "Ella" / "Lena") and a teacher name in the body.
   - Include `tone: "professional"` and `uiLocale` as above.
   - Assert the response has `success: true`, `generatedDraft` containing the greeting that echoes the child name and teacher signature, and `usage` metadata.

2. **Trust-grade violation**
   - POST `/api/draft/generate` with `situation` containing a banned phrase (English: "unacceptable", German: "inakzeptabel") and the same headers.
   - Expect `outcome: "INVALID_REQUEST"`, `errorCode: "TRUST_GRADE_VIOLATION"`, localized explanation text, and no `generatedDraft`.

3. **Panic Scan flow**
   - Upload a screenshot via `/api/panic-scan/upload` that triggers the `INSUFFICIENT_OCR` path (e.g., only UI chrome + greeting text).
   - Confirm the response status indicates the failure and the body contains `status: 422`, `code: "INSUFFICIENT_OCR"`, and the localized helper message describing the OCR limitation.

4. **Usage limit exceedance**
   - Simulate a free-plan user that has already reached the monthly limit (use test mode/data if available). POST the same `/api/draft/generate` payload.
   - Verify the response has `outcome: "RATE_LIMITED"`, `errorCode: "USAGE_LIMIT_EXCEEDED"`, and the `usage` object with `remaining: 0` plus the expected localized copy (English and German variants).

5. **Health check**
   - GET `/api/health`.
   - Expect `status: 200` and body confirming Firestore connectivity.

Document the results for both locales before tagging the launch as approved.
