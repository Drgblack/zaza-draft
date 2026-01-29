# Panic Scan QA (EN/DE)

## Devices to test
- iOS (Safari)
- Android (Chrome)
- Desktop (Chrome)

## Happy path
1. Set UI language to EN.
2. Upload or capture a clear screenshot of a parent message (include body text).
3. Verify: extracted text looks correct, draft generation succeeds.

Repeat in DE.

## Failure cases
### 1) Insufficient OCR
- Use an image with mostly UI chrome and no body text.
- Expect: 422 + INSUFFICIENT_OCR with correct, localised message (EN/DE).

### 2) Suspicious path rejection
- Attempt to submit a local file path instead of an uploaded file (if reproducible via devtools).
- Expect: 400 + INVALID_FILE_PATH with correct, localised message (EN/DE).

### 3) Analysis failure
- Force analysis failure (test env / mock) if available.
- Expect: 500 + PROCESSING_FAILED with correct, localised message (EN/DE).

## Notes to capture
- Device + browser + OS version
- UI language (EN/DE)
- Exact error code + message shown
- Any requestId shown in logs/response (if available)
