# Zaza Draft Knowledge Base
> **Note:** Draft was renamed to **Draft** on 2025-10-10. Any 'Draft' mentions below refer to Draft.

> **Note:** Draft was renamed to **Draft** on 2025-10-10. Any 'Draft' mentions below refer to Draft.


Single source of truth for Draft’s messaging rules, strategy bank, datasets, and QA cases.
Use this repo to guide Promptly v2.0 development (parsing → slot-fill → fixed strategies → compose → pronouns → quality gate).

## Structure
- \docs/Draft-v2.0-Rules.md\ — generation rules and quality gates
- \docs/Strategies.md\ — parent-facing strategy text (verbatim)
- \docs/TestCases.md\ — golden scenarios for QA
- \data/first-names-en-de.csv\ — names → pronoun inference (with UI override)

## How to consume (for engineers)
- Keep this repo as a submodule in the app repo or reference it in planning.
- Do **not** allow the model to invent strategies; use the strings in \docs/Strategies.md\.

---

## How to use this repo

- Treat this as the **single source of truth** for Draft messaging.
- Engineers consume:
  - \docs/Draft-v2.0-Rules.md\ for generation rules and quality gates.
  - \docs/Strategies.md\ for the **verbatim** strategy strings (do not let the model rewrite them).
  - \docs/TestCases.md\ for golden scenarios.
  - \data/first-names-en-de.csv\ for Auto pronoun inference (with a UI override in the app).

### Suggested app wiring (v2.0)
- Parse → slot-fill → insert **fixed strategies** → compose → enforce pronouns → **quality gate** → output.
- Keep this repo as a **submodule** in the app repo if helpful:
  \\\ash
  git submodule add https://github.com/Drgblack/zaza-draft-knowledge.git docs/knowledge
  \\\

## Change control

- If you change any rule wording or strategy text, update the corresponding **Golden Test** and include a short rationale in the PR.
- Keep strings in UK English.
- Avoid adding private/sensitive data; this repo can be public.

