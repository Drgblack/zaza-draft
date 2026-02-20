# Draft Entitlement Rollout

## Environment Variables

- `ZAZA_ID_BASE_URL`:
  Base URL for the Zaza ID service. Example:
  `https://zaza-id-and-licences.vercel.app`
- `ZAZA_ID_ENTITLEMENTS_ENABLED`:
  Feature flag for remote-first entitlement checks.
  - `1`/`true`/`yes`/`on`: use Zaza ID first
  - `0`/unset: keep local Firestore entitlement behavior

## Fallback Rules (when flag is enabled)

- Remote `200`: use Zaza ID entitlement.
- Remote `400/401/403`: treat as no access (`not_entitled`), do not fall back.
- Remote timeout, network failure, or `5xx`: fall back to existing local Firestore entitlement behavior.
