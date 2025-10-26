# Zaza Draft – GPT Marketplace Package

## Files
- `instructions.md` – system prompt
- `schema.json` – strict output contract
- `examples/` – sample inputs/outputs to prime behaviour
- `listing.md` – name, descriptions, tags
- `policy.md` – risks, mitigations, refusal patterns
- `faq.jsonld` – zero-click AEO FAQ

## Publish Steps (GPTs)
1. Create a new GPT → paste `instructions.md` into **Instructions**.
2. Set **Name/Descriptions/Tags** from `listing.md`.
3. Add example files (paste JSON as example outputs).
4. Disable tools you won’t use (no fake browsing/tools).
5. Test with short prompts; verify schema compliance.
6. Save Unlisted → QA → then Publish.

## Output Contract
All outputs must match `schema.json`. If a user asks for content outside scope, refuse and offer a safe alternative that still follows the schema.

## Safety
See `policy.md`. Always emphasize teacher review before sending messages.
