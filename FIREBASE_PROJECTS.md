# Firebase Projects

## Source of truth

- `zaza-draft-app` is the production source of truth for the Zaza Draft app.
- Use `zaza-draft-app` for production app users, roles, entitlements, admin access, and `user_profiles`.
- Local `.env.local`, Firebase Admin service accounts, and admin scripts should point to `zaza-draft-app` before running protected app user/admin operations.

## Legacy / non-production project

- `zaza-id-and-licences` is legacy / licensing / experimental.
- Do not use `zaza-id-and-licences` for Zaza Draft production user state.

## Operational rule

- Do not migrate data yet.
- Do not delete any Firebase project.
- Scripts that modify users, roles, entitlements, or `user_profiles` are blocked by default outside `zaza-draft-app` unless an explicit override flag is provided.
- Protected server routes fail closed when `FIREBASE_PROJECT_ID` is not `zaza-draft-app`.
