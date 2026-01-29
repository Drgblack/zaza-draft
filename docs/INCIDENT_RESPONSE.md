# Incident response (v1)

## Severity levels
- Sev 1: Core drafting is down or incorrect for most users.
- Sev 2: Partial degradation, specific feature broken (Panic Scan, entitlements).
- Sev 3: Minor bug, workaround exists.

## Triage checklist
- Confirm scope (Preview vs Production, EN vs DE)
- Check /api/health
- Reproduce with a minimal safe input
- Identify the first failing deployment

## Comms (v1)
- Internal: record issue summary, severity, and current status
- External: if users are affected, publish a short status update

## Fix and verify
- Hotfix on a branch with minimal diff
- pnpm -s test:unit
- Deploy Preview, run smoke tests (EN and DE)
- Deploy Production
- Monitor for recurrence

## Post-incident
- Add a short note to REGRESSIONS.md with cause and prevention
