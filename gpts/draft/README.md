# Zaza Draft – GPT Marketplace Package

## Files
- `instructions.md` – system prompt
- `schema.json` – strict output contract
- `examples/` – sample inputs/outputs to prime behaviour
- `listing.md` – name, descriptions, tags
- `policy.md` – risks, mitigations, refusal patterns
- `faq.jsonld` – zero-click AEO FAQ

## How to publish this GPT
1. Create a new GPT and paste `instructions.md` into **Instructions**.
2. Set **Name**, **Short/Long Description**, and **Tags** using `listing.md`.
3. Add example outputs (copy from `examples/*.json`).
4. Configure tools: disable any not needed (no browsing or plugins).
5. Test with short prompts; verify outputs match `schema.json` exactly.
6. Save as Unlisted, QA thoroughly, then Publish.

## Output Contract
All outputs must match `schema.json`. If a user asks for content outside scope, refuse and offer a safe alternative that still follows the schema.

## Safety
See `policy.md`. Always emphasize teacher review before sending messages.

