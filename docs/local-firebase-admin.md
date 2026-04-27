# Local Firebase Admin

## Source of truth

`zaza-draft-app` is the source of truth for Zaza Draft app users, entitlements, roles, admin data, and `user_profiles`.

`zaza-id-and-licences` is legacy / licensing / experimental. Do not use it for Zaza Draft production app user state.

Before running local admin, account, entitlement, bootstrap, or diagnostics flows, make sure your local `.env.local` and service account both point to `zaza-draft-app`.

When running the server locally, the Firebase Admin SDK must have explicit credentials and a project ID. It no longer falls back to `metadata.google.internal`, so both pieces are required before `pnpm dev` starts successfully.

## 1. Download a service account JSON

1. Open the Firebase Console for your project → Settings (gear) → Service accounts.
2. Click **Generate new private key** under the Firebase Admin SDK section.
3. Save the downloaded JSON to a secure location that is not under version control.

Use the `zaza-draft-app` Firebase project when downloading the service account.

## 2. Provide credentials via `FIREBASE_SERVICE_ACCOUNT_JSON`

This is the preferred option for local development because it keeps everything in environment variables:

* Add the JSON string to your `.env.local`:
  ```env
  FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"zaza-draft-app","private_key":"-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n",...}'
  FIREBASE_PROJECT_ID=zaza-draft-app
  ```
* Replace newline characters in `private_key` with `\n` inside the JSON value so the SDK can rehydrate the key.
* Keep `.env.local` out of git (it’s already ignored) and never log the JSON.
* The server prefers this variable and logs `[firebase-admin] initialized projectId=... using serviceAccountJson`.

## 3. Alternative: use `GOOGLE_APPLICATION_CREDENTIALS`

If you prefer pointing to the JSON file instead of inlining it:

1. Keep the downloaded `zaza-draft-app` JSON on disk (e.g., `C:\secrets\firebase-admin.json`).
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

* Set `FIREBASE_PROJECT_ID=zaza-draft-app` for server-only usage. If you need the project ID in the browser, also set `NEXT_PUBLIC_FIREBASE_PROJECT_ID=zaza-draft-app`.
* The server throws an error at startup if neither is defined, so check the message before running `pnpm dev`.

Wrong local config example:

```env
FIREBASE_PROJECT_ID=zaza-id-and-licences
NEXT_PUBLIC_FIREBASE_PROJECT_ID=zaza-id-and-licences
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\User\Secrets\zaza-id-and-licences\serviceAccountKey.json
```

Expected local config:

```env
FIREBASE_PROJECT_ID=zaza-draft-app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=zaza-draft-app
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\User\Secrets\zaza-draft\zaza-draft-service-account.json
```

## 5. Authorize Vercel domains for Google sign-in

1. Open the Firebase Console → Authentication → Settings → Authorized domains.
2. Add every host that teachers might hit:
   * `localhost`
   * `localhost:3000`
   * `zaza-draft-28d67g61r.vercel.app` (active preview build)
   * `zaza-draft.vercel.app` (production alias)
   * Any other custom domain you publish the app under (e.g., `your-school.zazadraft.com`).
3. If you’re unsure which domains to add, open Vercel → Deployments → your project and copy the `Preview` / `Production` URLs shown at the top; paste those exact hostnames into the authorized list.

Unauthorized-domain errors show up before the Google popup closes; keep an eye on your browser console while signing in and make sure there are no `auth/unauthorized-domain` messages.

## 6. Prod sanity check

1. Deploy to Vercel (production or preview), open the live site, and sign in with Google.
2. After sign-in completes, call `/api/bootstrap` (via the UI or `curl https://<your-domain>/api/bootstrap` with the Google token) and confirm it returns `200`.
3. Watch the server logs or terminal for `metadata.google.internal` requests; the Firebase Admin SDK should not print any metadata lookup errors anymore.
4. If either step fails, re-check the authorized domains list, ensure the service account credentials are available to the server, and verify `FIREBASE_PROJECT_ID` plus credentials are set before rerunning the build.
## 5. Troubleshooting

* If you see `Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS` in your logs, set one of the credentials variables.
* If you see a Firebase project safety error, your local env is pointed at the wrong Firebase project. Align both `FIREBASE_PROJECT_ID` and your service account with `zaza-draft-app`.
* Keep secrets out of logs and don’t print the full JSON file.
* Once the server starts, POST `/api/bootstrap` should return 200 without any `metadata.google.internal` errors.
