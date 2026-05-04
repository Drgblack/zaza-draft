# Teacher-Draft Pipeline Completeness

## Summary

Teacher-draft generation can return a success response with metadata that looks healthy while the substantive body has collapsed to a stub. The observed production shape was:

- subject generated as a deterministic fallback such as `Update on homework`
- greeting/body reduced to a stub such as `Hello Dear,`
- auth or profile signature still appended
- success metadata still emitted, including a high `sendConfidenceScore`

This note captures the diagnosis only. It does not propose shipping changes in the current Shereen A/B work.

## Likely Failure Path

The strongest code-path candidate is a late-stage collapse after the initial minimum-output safeguard:

1. Initial minimum-output recovery runs in [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:2884>).
2. Later stages can still replace `generatedDraft` during:
   - teacher-draft quality retry at [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:3398>)
   - teacher-draft boutique fallback at [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:3495>)
   - output-safety rewrites at [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:3249>)
3. There is no second minimum-output guard after those late-stage rewrites.

That means a collapsed late-stage draft can still survive to the final response.

## Why Success Metadata Can Still Look Good

The completeness gap is not strongly penalized by the current evaluators:

- teacher-draft quality evaluation in [lib/draft/quality-evaluation.ts](</C:/Users/User/Projects/zaza-draft/lib/draft/quality-evaluation.ts:305>) focuses on fabrication, tone drift, boundary dilution, signoff drift, and similar checks. It does not have a hard "body content disappeared" failure.
- professional judgement scoring in [lib/draft/professional-judgement.ts](</C:/Users/User/Projects/zaza-draft/lib/draft/professional-judgement.ts:251>) scores clarity, authority, interpretation risk, reply likelihood, and regret risk, but it also does not enforce a substantive-body minimum.

As a result, a short or collapsed output can still receive a non-failing verdict and a misleadingly high `sendConfidenceScore`.

## Subject and Signature Clues

Two output clues point to fallback and post-processing rather than a clean source-preserving path:

- synthetic subjects such as `Update on homework` come from deterministic subject/fallback logic, not from the editor text
- appended profile-based signatures can still appear after the body has collapsed, because signoff normalization runs independently of body completeness

Relevant lines:

- subject normalization in [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:2784>)
- signoff normalization in [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:2548>)

## Fix Sketch

The follow-up should focus on pipeline completeness rather than a narrow string fix:

1. Re-run the minimum-output safeguard after all late-stage rewrite and fallback stages, not only before them.
2. Add a hard completeness check to teacher-draft quality evaluation so severe body loss cannot be marked `improved`.
3. Consider a body-preservation check comparing meaningful body content before and after late-stage retries.
4. Expand structured final-stage logging to record:
   - pre-final word count
   - post-final word count
   - whether a late-stage retry replaced the full draft with a stub
   - the final recovery stage that last wrote `generatedDraft`

## Relevant Shereen Follow-Up Context

During the `fix/shereen-feedback` work, teacher-draft mode was explicitly excluded from the greeting-body recovery template trigger in [app/api/draft/generate/route.ts](</C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts:3090>). That change was made to preserve teacher-authored greetings verbatim rather than forcing already-authored drafts through the generic greeting-body retry path.

This appears to have had a beneficial side effect for the Sally-style collapse case: teacher drafts are less likely to be rerouted through the deterministic greeting-body retry/fallback path that can overwrite source-grounded content with a generic stub. This is not a full fix for completeness, but it is relevant context for future Test C work because:

- it changes one late-stage recovery branch that previously touched teacher drafts
- it may explain why a previously empty-body production case began returning a fuller draft after the greeting-preservation work
- any future completeness refactor should preserve the policy that teacher-draft mode must not be forced through the generic greeting-body template path unless there is a very strong reason

## Risk

This is medium-to-high risk because it changes rewrite orchestration, not just rendering. It needs dedicated regression tests around:

- late-stage teacher-authenticity retries
- output-safety rewrites
- boutique fallback
- minimum-output recovery after retries
