# Local Firebase Admin

When running the server locally, the Firebase Admin SDK must have explicit credentials and a project ID. It no longer falls back to `metadata.google.internal`, so both pieces are required before `pnpm dev` starts successfully.

## 1. Download a service account JSON

1. Open the Firebase Console for your project → Settings (gear) → Service accounts.
2. Click **Generate new private key** under the Firebase Admin SDK section.
3. Save the downloaded JSON to a secure location that is not under version control.

## 2. Provide credentials via `FIREBASE_SERVICE_ACCOUNT_JSON`

This is the preferred option for local development because it keeps everything in environment variables:

* Add the JSON string to your `.env.local`:
  ```env
  FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n",...}'
  FIREBASE_PROJECT_ID=your-project
  ```
* Replace newline characters in `private_key` with `\n` inside the JSON value so the SDK can rehydrate the key.
* Keep `.env.local` out of git (it’s already ignored) and never log the JSON.
* The server prefers this variable and logs `[firebase-admin] initialized projectId=... using serviceAccountJson`.

## 3. Alternative: use `GOOGLE_APPLICATION_CREDENTIALS`

If you prefer pointing to the JSON file instead of inlining it:

1. Keep the downloaded JSON on disk (e.g., `C:\secrets\firebase-admin.json`).
2. In PowerShell for the current session:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secrets\firebase-admin.json"
   pnpm dev
   ```
3. To persist the variable across PowerShell sessions:
   ```powershell
   setx GOOGLE_APPLICATION_CREDENTIALS "C:\secrets\firebase-admin.json"
   ```
4. The server will log `[firebase-admin] initialized projectId=... using applicationDefault`.

## 4. Make sure a project ID is always present

* Set `FIREBASE_PROJECT_ID` for server-only usage. If you need the project ID in the browser, also set `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
* The server throws an error at startup if neither is defined, so check the message before running `pnpm dev`.

## 5. Troubleshooting

* If you see `Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS` in your logs, set one of the credentials variables.
* Keep secrets out of logs and don’t print the full JSON file.
* Once the server starts, POST `/api/bootstrap` should return 200 without any `metadata.google.internal` errors.
