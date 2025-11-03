<<<<<<< HEAD
# Preview/Prod Smoke Checks

This runbook shows how to run quick health and draft checks against Vercel preview and production, including protection bypass.

## Prerequisites
- Set a Vercel Protection Bypass token (project → Settings → Security → Protection Bypass). Copy the token value.
- In GitHub → Repo → Settings → Secrets and variables → Actions → add:
  - PREVIEW_URL: the full preview URL (e.g., https://zaza-draft-git-feature-draft-gpt-build-<id>-vercel.app)
  - VERCEL_PROTECTION_BYPASS: the token value
- Optionally set OPENAI_API_KEY in Vercel (Preview/Production) to enable real completions. Mock fallback remains enabled.

## REST examples (VS Code REST Client)
- Add the header and cookie when hitting protected previews:
  - Header: `x-vercel-protection-bypass: <token>`
  - Cookie: `vercel-bypass=<token>`
- Endpoints:
  - GET /api/health
  - POST /api/draft/generate
    Body:
    {
      "notes": "Student improving in group work; needs help starting writing.",
      "tone": "warm",
      "language": "en"
    }

## CLI smoke script
- Local dev:
  BASE_URL=http://localhost:3011 npm run test:smoke
- Preview/prod (with protection bypass):
  BASE_URL=https://<preview-or-prod-url> \
  PROTECTION_BYPASS=<token> \
  npm run test:smoke

The script sends both the header `x-vercel-protection-bypass` and the cookie `vercel-bypass` automatically when PROTECTION_BYPASS is set.

## CI preview smoke
- The CI workflow includes a `preview-smoke` job that runs on PRs when `PREVIEW_URL` is configured. It uses `VERCEL_PROTECTION_BYPASS` to hit the preview safely.
- Configure secrets:
  - PREVIEW_URL = https://<preview-url>
  - VERCEL_PROTECTION_BYPASS = <token>

## Logs and telemetry
- Check Vercel → Deployments → Functions logs for:
  - `TELEMETRY: unmapped_tone_label` (tone mapping drift)
- If drift is frequent, we can tighten the client/server mappers.

## Notes
- Model: gpt-4o-mini (optional; gated by OPENAI_API_KEY). Mock fallback is always safe and schema-validated.
- Tones: warm | professional | direct | empathetic; Languages: en | de | es | fr
- The API strictly validates and will return 400 for invalid inputs.
=======


>>>>>>> 4d45b08663ae7a0c76fa4fe1b48902e3b6b81222
