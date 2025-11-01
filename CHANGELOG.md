# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-10-31

### Added
- Playwright E2E test suite and CI integration (HTML report artifact).
- Billing page and Stripe Checkout / webhook handling.
- Logging and audit writes for key events (snippet generation, plan changes, monthly resets).
- Release preflight script (`scripts/release-check.js`) and CI preflight step to validate envs and deployment artifacts.

### Changed
- Students CRUD UX: optimistic updates, toasts, and loading states.
- Accessibility improvements: focus management and confirm dialog.

### Fixed
- Various production-hardening fixes: TEST_MODE gating for webhooks, PII redaction in logs, and basic rate-limiting scaffolding.
