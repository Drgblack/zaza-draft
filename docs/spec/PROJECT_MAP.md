# Zaza – Project Map

This project spans **three** local repos:

1) **Service Monorepo**: C:\Users\User\zaza-monorepo
   - Hosts pps/service (Fastify API) with routes: /health, /autoplanner/plan, /draft/comments, /gradeflow/assess.
   - Local base: http://127.0.0.1:8787 (or your chosen port).
   - Smoke test: .\ops\smoke.ps1 -Port 8787 -User test@zaza.dev.

2) **App Repo**: C:\Users\User\zaza-draft-app
   - ChatGPT Marketplace client/app, manifests, UI, adapter to call the service.

3) **Knowledge Repo**: C:\Users\User\zaza-draft-knowledge
   - Prompts, rubrics, fixtures, teacher content, sample payloads.

## Open all together
- Workspace file: C:\Users\User\zaza-draft.code-workspace

## Key environment values
- SERVICE_BASE=http://127.0.0.1:8787
- KNOWLEDGE_DIR=C:\Users\User\zaza-draft-knowledge

## Quick checks
- API health: GET \/health → {"ok":true}
- Knowledge assets live under: \C:\Users\User\zaza-draft-knowledge