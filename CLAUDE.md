# CLAUDE.md

Guidelines for using Claude or code assistants in this repository

## Purpose

This repo hosts Zaza Draft - an AI tool that helps teachers write authentic, emotionally intelligent comments and messages faster, with school-ready safeguards. This file tells Claude how to work inside this codebase so we move fast without breaking things.

## House style

- UK English
- No em dashes - use hyphens
- Plain, clear, teacher-first language

## Core principles

- Teacher trust and wellbeing first
- Explainable outputs with light "why this" hints
- Privacy and safety guardrails
- Fast iteration with small PRs

## Repository layout

- /docs - product scope, dev spec, wireframes, research, decisions
- /design - exports and assets
- /app - application code (web or mobile). If using Next.js, it sits here

## Tech defaults (web app)

- Framework - Next.js App Router with TypeScript
- Package manager - pnpm
- Linting - ESLint + Prettier
- Styling - Tailwind or CSS Modules. Keep it minimal and accessible
- i18n - English (UK) default, German required for public copy
- Testing - Vitest and React Testing Library
- Analytics - add later via environment flags

## Environment variables

Create a local .env file. Do not commit secrets.

- OPENAI_API_KEY=
- NEXT_PUBLIC_APP_ENV=development|staging|production
- NEXT_PUBLIC_DEFAULT_LOCALE=en
- NEXT_PUBLIC_SUPPORTED_LOCALES=en,de

## Accessibility and UX

- Target WCAG AA
- Keyboard navigation must work for all interactive controls
- Forms must have labels and helpful validation messages
- Prefer progressive enhancement and graceful fallback

## i18n rules

- All user facing strings must be translatable
- English and German must be covered for launch pages
- Never hardcode copy in components. Use translation helpers
- Date, time, number formatting must respect locale

## Data and safety

- Never log PII or prompts that could reveal student data
- Redact content in logs by default
- Validate inputs at boundaries and sanitise outputs
- Provide optional "explain this suggestion" text that is short and teacher-friendly

## Commit and branch conventions

- Branches: feat/<area>-<short>, fix/<area>-<short>, chore/<area>-<short>, docs/<area>-<short>
- Commits: <type>(<area>): <message>
  - feat, fix, chore, docs, refactor, test, ci
  - Example: feat(editor): add tone suggestions panel

## Pull request checklist

- Scope is small and focused
- Screenshots or short clip if UI changed
- English and German copy included when applicable
- Tests updated or added for logic
- No console logs or stray TODOs
- Docs updated when behaviour or API changes

## Definition of done

- Builds locally
- Lints clean
- Tests pass
- i18n covered
- UX accessible
- Linked to a task or ADR if it changes a decision

## Architecture decisions (ADRs)

Store ADRs in /docs/decisions as ADR-XXX-title.md with context, options, choice, consequences.

## Tasks Claude can do safely

- Generate strongly typed components with minimal dependencies
- Add i18n keys and placeholders for en and de
- Write unit tests and small integration tests
- Create simple API routes with clear validation
- Refactor files to shared utilities with tests
- Draft small docs and ADR skeletons

## Tasks Claude should not do without approval

- Introduce new dependencies
- Change build tooling or CI
- Alter auth, storage, or payment logic
- Modify data retention or analytics flags
- Large rewrites or sweeping rename operations

## Prompts to use with Claude

### Implement a new component

You are working in the Zaza Draft repo. Follow CLAUDE.md rules.
Goal - build a <ComponentName> for <purpose>. Keep code minimal and accessible.
Requirements

- TypeScript and React
- i18n - add en and de keys
- Keyboard accessible
- Include basic tests
  Deliver
- Component file in /app/<path>
- Test file in the matching **tests** folder
- i18n keys in the locale files
- A short usage example in the PR description

### Add i18n to an existing file

Audit the file for hardcoded strings and replace them with i18n calls.
Add keys under contact._, editor._, etc. Provide en and de entries.
Do not change logic. Include a quick test to verify a German label renders.

### Draft an ADR

Create /docs/decisions/ADR-XXX-<short-title>.md
Context, options, decision, consequences. Keep to one page.

## Code quality expectations

- Keep functions small and name things clearly
- Never rely on any outputs being safe - validate and encode
- Do not introduce implicit any or ts-ignore unless justified
- Prefer composition over deep prop drilling

## Performance and loading

- Lazy load heavy components
- Optimise images through the framework
- Use suspense boundaries where useful
- Avoid blocking the main thread

## Error handling

- Friendly, recoverable messages in the UI
- Log to console only in development
- Surface actionable errors with next steps

## Security basics

- Input validation on every API route
- Rate limiting where appropriate
- No secrets in the client bundle
- Keep dependencies patched

## Release flow

- Feature branch
- PR with checklist
- Review and squash merge to main
- Tag releases with semantic versions when user facing
- Update /docs/CHANGELOG.md if behaviour changes

## Contact and ownership

- Product owner - Dr. Greg Blackburn (CLO)
- Working language - English (UK). Provide German copy for public pages
- If in doubt, prefer simple and safe over clever and risky
