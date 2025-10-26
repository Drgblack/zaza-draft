# Release Guide

This doc explains how we cut, tag, and ship Zaza Draft versions. Style: UK English, no em dashes, teacher-first copy.

## Versioning

- Semantic Versioning: MAJOR.MINOR.PATCH
- Start at 0.x while moving fast. Use 1.0.0 once public users rely on it.

## Branches

- main: always releasable
- Feature branches: feat/_, fix/_, chore/_, docs/_
- Hotfix branches: hotfix/\* from latest tag

## Pre-release checklist

- [ ] All PRs merged into main
- [ ] Lint clean: pnpm lint
- [ ] Type checks pass: pnpm typecheck
- [ ] Tests pass: pnpm test
- [ ] Build passes: pnpm build
- [ ] i18n audit done for changed UI (EN and DE)
- [ ] Accessibility basics checked for new UI
- [ ] docs/CHANGELOG.md updated under [Unreleased]
- [ ] ADRs updated if decisions changed

## Steps to release

1. Choose version: X.Y.Z
2. Update CHANGELOG:
   - Move entries from [Unreleased] into a new section ## [X.Y.Z] - YYYY-MM-DD
   - Leave a fresh [Unreleased] section at the top
3. Commit:
   - git commit -am "chore(release): X.Y.Z"
4. Tag:
   - git tag -a vX.Y.Z -m "Release X.Y.Z"
   - git push && git push --tags
5. Create a GitHub Release:
   - Title: X.Y.Z
   - Body: paste the CHANGELOG section for this version
6. Deploy (if applicable, e.g. Vercel):
   - Verify the deployment URL
   - Smoke test the key flows
7. Announce:
   - Short internal note with highlights and any follow-ups

## Post-release

- Open follow-up issues for any deferred items
- Monitor errors and feedback
- Consider a small patch if needed

## Hotfix flow

1. Branch: hotfix/X.Y.Z+1
2. Fix only the urgent issue
3. Repeat the release steps for a PATCH version
4. Merge back to main

## Rollback plan

- If production is broken:
  - Revert the offending commit(s) on main
  - Trigger a new deployment
  - Keep the tag history for traceability
