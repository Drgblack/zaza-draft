# Pipeline Normalisation Audit

Date: 2026-05-04
Branch audited: `fix/shereen-feedback`

This report catalogs the places where the draft-generation pipeline modifies, overrides, normalises, or synthesises content instead of treating the teacher's input as the primary source of truth.

Policy 1, as used here, means:
- Preserve teacher-authored greeting and signoff verbatim when present.
- Prefer the teacher's literal draft over generic downstream normalisation.
- Do not add subjects, greetings, signoffs, collaboration offers, support-process language, or follow-up phrasing unless the product explicitly intends that behaviour.

This is diagnosis only. No code changes are proposed here beyond fix sketches.

## Highest Impact

### 1. Prompt-level framing asks the model to generate a canonical email shape
File: `lib/ai/provider.ts:772-799`, `lib/ai/provider.ts:859-905`, `lib/ai/provider.ts:918-949`, `lib/ai/provider.ts:1096-1121`

Trigger:
- Any parent-message generation.
- Stronger on rewrite passes when `teacherDraftQualityViolations`, `teacherAuthenticityViolations`, or `professionalJudgementConstraints` are present.

Behaviour:
- Instructs the model to include a subject line.
- Instructs the model to avoid producing its own closing because a canonical closing is added downstream.
- In rewrite passes, explicitly tells the model not to preserve rough wording and to infer intent rather than restate source language.
- Sends `signatureBlock` into prompt context when present.

Rationale:
- Best inference: this was written to produce consistently formatted parent-facing emails and to centralise final signoff formatting downstream.
- The rewrite instructions are also trying to make risky drafts calmer, more defensible, and more "sendable".

Risk vs Policy 1:
- High. Even before deterministic post-processing runs, the model is being asked to normalise the teacher's draft into house style rather than preserve it.
- This is the earliest stage where teacher-authored greeting/signoff/subject/body wording can be discarded.

Fix:
- Split prompt policy by input intent.
- For `teacher_draft` mode, change instructions from "infer intent and rewrite" to "preserve authored structure unless safety or clarity repair is necessary".
- Stop sending downstream-canonical-signoff assumptions on teacher-draft paths.

Implementation risk:
- Medium to high. This changes model behaviour across the whole rewrite path and would need broad regression testing.

### 2. Signature resolution still derives canonical signature metadata from auth/profile state
File: `app/api/draft/generate/route.ts:2250-2296`, `app/api/draft/generate/route.ts:2606`, `app/api/draft/generate/route.ts:3975`, `app/api/draft/generate/route.ts:4106`, `lib/draft/signature.ts:25-48`, `lib/ai/provider.ts:1106-1107`

Trigger:
- Any request that is not `parent_message + teacher_draft`, or any path that still uses `resolvedSignature`.
- Metadata emission always happens, even when preview/export no longer render from that metadata.

Behaviour:
- Resolves `teacherSignatureName` from the source draft, requested signature, auth display name, or fallback placeholder.
- Builds `resolvedSignature.block`.
- Injects `signatureBlock` into provider input and response/snippet metadata.

Rationale:
- Best inference: the original design assumed parent messages should end with a consistent teacher signature, ideally linked to the signed-in teacher profile.

Risk vs Policy 1:
- High historically, now medium operationally.
- The main preview/PDF bug has been fixed on this branch, but the route still manufactures signature metadata from auth data and ships it around as if it were authoritative.
- That leaves room for future regressions anywhere a client or export path trusts metadata over `draftText`.

Fix:
- Treat `signatureBlock` as derived display metadata only when explicitly requested.
- For teacher-draft mode, emit source-derived signature metadata only, or emit none.
- Stop passing auth-derived signature context into prompt and snippet metadata for teacher-draft flows.

Implementation risk:
- Medium. The current branch already moved runtime preview/export away from this metadata, so the remaining work is mostly cleanup and explicit contract changes.

### 3. Final greeting enforcement can replace the model's opening with a resolved greeting
File: `app/api/draft/generate/route.ts:1973-2076`, `app/api/draft/generate/route.ts:2778-2790`, `app/api/draft/generate/route.ts:2815-2830`, `lib/draft/final-greeting.ts:48-93`, `lib/draft/greeting-resolution.ts:287-327`, `app/api/draft/generate/route.ts:1613-1709`

Trigger:
- Any parent-facing message with a resolved or inferred greeting.
- Strongest when `greetingFinal` is true or `greetingSource` is `resolved-name`.

Behaviour:
- Extracts a greeting from teacher draft, OCR/raw text, recipient override, trailing names, or generic fallback.
- Applies `applyFinalGreetingGuard`, which can replace the first line of the draft with the resolved greeting.
- Can fall back to `Dear Parent/Carer,` or `Guten Tag,`.
- `enforceTitledGreetingSafeguard` can upgrade `Dear Smith` to `Dear Mrs Smith`.

Rationale:
- Best inference: this was written to standardise parent-message openings and avoid malformed or untitled greetings.

Risk vs Policy 1:
- High for teacher-draft flows.
- The safeguard helps correctness in some cases, but it is still an override layer that can generalise or rewrite the teacher's chosen salutation.
- This class of logic caused the shipped `Dear Parent/Carer` regressions earlier today.

Fix:
- For teacher-draft mode, only resolve a greeting when the source draft has none.
- Treat `applyFinalGreetingGuard` as a repair for empty or malformed generated output, not as a universal normaliser.
- Keep title correction optional and source-aware rather than mandatory.

Implementation risk:
- Medium. Greeting enforcement is entangled with several recovery paths.

### 4. Subject synthesis can add or replace a teacher-authored subject
File: `app/api/draft/generate/route.ts:3046-3056`, `lib/draft/subject-policy.ts:95-209`, `lib/draft/fallback.ts:96-119`, `lib/draft/fallback.ts:515-525`

Trigger:
- Any non-`alreadyStrongTeacherDraft` parent-message path.
- Any fallback/template path.

Behaviour:
- `applyModeAwareSubjectLine` parses the current draft, resolves a subject from explicit context or detected topic, and inserts/replaces the subject line.
- Fallback paths use canned subjects such as `Subject: Update on homework`.

Rationale:
- Best inference: the product wants all parent messages to look like concise professional emails with a clear subject.

Risk vs Policy 1:
- High for teacher-draft mode.
- If the teacher wrote no subject, this adds one.
- If the existing subject is treated as replaceable fallback text, it can still be replaced.
- This is the direct source of `Update on homework` appearing in minimal-output and fallback outputs.

Fix:
- For teacher-draft mode, never synthesise a subject unless the UI explicitly asks for one.
- Separate "format a parent email from notes" from "light-touch revise my existing email".

Implementation risk:
- Medium. Subject policy is localised, but several tests assume every parent message gets a subject line.

### 5. Deterministic fallback builders generate new body copy not grounded in the teacher's exact words
File: `app/api/draft/generate/route.ts:2697-2777`, `app/api/draft/generate/route.ts:3175-3206`, `app/api/draft/generate/route.ts:3225-3256`, `lib/draft/fallback.ts:435-512`, `lib/draft/fallback.ts:527-1013`, `lib/draft/fallback.ts:1047-1204`, `lib/draft/fallback.ts:1281-1324`

Trigger:
- Provider failure.
- Minimum-output recovery.
- Greeting/body recovery failure.
- Generic recovery overuse.
- Teacher-style fallback.
- Boutique teacher-draft fallback.

Behaviour:
- Builds canned or semi-source-grounded paragraphs such as:
  - `Thank you for getting in touch...`
  - `I will follow this up in school...`
  - `If a further conversation would be helpful...`
  - `The classroom expectation is that...`
- Adds a fallback subject, greeting, and closing block.
- Some paths are issue-kind specific; others are generic templates.

Rationale:
- Best inference: this was written to guarantee a sendable output even when the provider fails or produces unusable/generic text.
- There is an explicit comment at `route.ts:2701-2703` describing this as a UX choice to prefer deterministic source-grounded recovery over surfacing generic text or failing.

Risk vs Policy 1:
- Very high.
- These paths are intentionally synthetic and can add support-process language, collaboration offers, or framing that never existed in the teacher's draft.
- This is the clearest source of Sally-style invented lines such as support/follow-up phrasing.

Fix:
- Split fallbacks by input intent.
- For teacher-draft mode, prefer "return the teacher's original draft with only safety-critical edits" over generating new template paragraphs.
- Keep synthetic fallback builders for teacher-notes-to-parent mode only.

Implementation risk:
- High. These builders are the safety net for multiple failure cases.

## High Impact

### 6. Minimum-output recovery can discard the generated body and substitute fallback or template text
File: `app/api/draft/generate/route.ts:3122-3206`

Trigger:
- Parent-message output has too few meaningful words or paragraphs.
- Optional continuation retry also fails or is skipped.

Behaviour:
- Retries generation as a continuation.
- If still too short, replaces output with `buildRouteFallbackDraft(...)`.
- If that still fails minimum thresholds, replaces output with `buildDeterministicTemplateBody(...)`.

Rationale:
- Best inference: avoid returning empty, greeting-only, or collapsed drafts to the user.

Risk vs Policy 1:
- High.
- This can turn a lightly revised teacher draft into a fully templated email with synthetic subject, greeting, body, and signoff.
- This stage explains how `Update on homework` and other generic scaffolding can appear even when the source draft was specific.

Fix:
- In teacher-draft mode, make minimum-output recovery prefer source preservation over template generation.
- Re-run completeness checks after later retries, not only here.

Implementation risk:
- Medium to high. This interacts with other recovery passes and with the earlier Sally/Test C diagnosis.

### 7. Generic recovery guard replaces "too generic" outputs with deterministic source-grounded fallback text
File: `app/api/draft/generate/route.ts:1430-1487`, `app/api/draft/generate/route.ts:3208-3223`

Trigger:
- Output contains known generic phrases and does not mention issue anchors.
- Report comments leak email structure.

Behaviour:
- Detects generic recovery overuse.
- Replaces current output with deterministic fallback text based on source issue kind.

Rationale:
- Explicit from code comment: replace generic drafts with deterministic source-grounded recovery rather than showing generic text.

Risk vs Policy 1:
- High.
- This is content replacement, not content preservation.
- It may improve specificity compared with a generic AI draft, but it still substitutes house-written paragraphs for the teacher's wording.

Fix:
- For teacher-draft mode, prefer source-preserving copy-edit fallback over deterministic reconstruction.
- Restrict generic recovery replacement to teacher-notes mode.

Implementation risk:
- Medium.

### 8. Output-safety and blocked-language rewrites can regenerate the whole draft
File: `app/api/draft/generate/route.ts:3476-3554`, `app/api/draft/generate/route.ts:1724-1755`, `app/api/draft/generate/route.ts:1031-1057`

Trigger:
- Blocked language detection.
- Output safety analysis says the draft is too accusatory/escalatory/risky.

Behaviour:
- Calls `reRunWithRewrite(...)` with the previous draft as rewrite input.
- Replaces the current draft with a rewritten version.
- Can loop up to `MAX_OUTPUT_SAFETY_REWRITE_ATTEMPTS`.

Rationale:
- Best inference: reduce legal/professional risk and keep parent messages school-safe.

Risk vs Policy 1:
- High but partially intentional.
- This is the stage where preserving literal wording is most likely to be sacrificed for risk reduction.
- It can still introduce downstream drift if the rewrite instructions remain broad.

Fix:
- Keep this stage, but narrow its contract.
- For teacher-draft mode, require minimal necessary edits and forbid structural additions unless directly tied to the unsafe phrase.

Implementation risk:
- Medium. Safety rewrites are necessary; the risk is changing them too aggressively.

### 9. Teacher-authenticity retry and fallback can swap in generic teacher-safe template language
File: `app/api/draft/generate/route.ts:3309-3382`

Trigger:
- `detectTeacherAuthenticityViolations(...)` finds generic or AI-sounding phrasing.

Behaviour:
- Requests a rewrite with specific phrase/type bans.
- If violations remain, replaces output with `buildRouteFallbackDraft(...)`.

Rationale:
- Best inference: make the result sound like a real teacher rather than generic AI copy.

Risk vs Policy 1:
- High.
- This stage can replace teacher-authored content because it prioritises "teacher authenticity" as defined by heuristics over literal source fidelity.

Fix:
- For teacher-draft mode, treat authenticity failures as advisory unless the result is clearly unusable.
- Prefer source-preserving cleanup over fallback template generation.

Implementation risk:
- Medium.

### 10. Teacher-draft quality and professional-judgement retries can regenerate or replace the whole draft
File: `app/api/draft/generate/route.ts:3564-3849`

Trigger:
- `evaluateDraftQuality(...)` returns `needs_rewrite`.
- `evaluateProfessionalJudgement(...)` suggests low clarity, low authority, high reply likelihood, or low send confidence.

Behaviour:
- Builds `teacherDraftQualityViolations` and `professionalJudgementConstraints`.
- Retries generation up to twice with those constraints.
- Applies register normalisation after retries.
- Falls back to route fallback or, if fallback quality also fails, snaps back to copy-edit-only source.

Rationale:
- Best inference: protect users from sending drafts that feel weak, risky, patronising, or professionally ambiguous.

Risk vs Policy 1:
- High.
- This is a large policy layer that can rewrite content even when the teacher already authored the message.
- The intent is defensible, but it conflicts directly with "preserve exact teacher input unless necessary".

Fix:
- Separate "assessment" from "replacement".
- Keep scoring and warnings, but require an explicit threshold before whole-draft regeneration is allowed in teacher-draft mode.

Implementation risk:
- High. This is one of the central orchestration stages in the route.

## Medium Impact

### 11. Final signoff normalisation still canonicalises closing structure
File: `app/api/draft/generate/route.ts:2799-2829`, `lib/draft/ensure-single-signoff.ts:138-160`

Trigger:
- Any non-documentation output.
- Any parent-message mode where signoff is appended or normalised.

Behaviour:
- Strips trailing signoff-like content.
- Rebuilds a closing block with a resolved closing line and signature lines.
- Can use fallback names such as `Your child's teacher` or `Ihre Klassenlehrkraft`.

Rationale:
- Best inference: enforce one clean signoff block and prevent duplicate closings.

Risk vs Policy 1:
- Medium.
- The branch fixes now preserve teacher signoffs better, but this stage still rewrites closing punctuation and block layout into canonical form.
- For a strict Policy 1 interpretation, even layout-level rewriting is still a transformation.

Fix:
- In teacher-draft mode, preserve the source closing block verbatim when one exists.
- Use canonical signoff construction only for note-to-parent drafting, not for literal draft preservation.

Implementation risk:
- Medium.

### 12. Pronoun, student-reference, and teacher-language cleanup rewrites body wording
File: `app/api/draft/generate/route.ts:2778-2790`, `lib/draft/teacher-language.ts:43-191`, `lib/text/pronouns.ts:198-257`

Trigger:
- Every non-documentation route pass through `finalizeDraft(...)`.

Behaviour:
- Repairs pronoun case grammar.
- Forces pronoun preference.
- Inserts first name into the first sentence if missing.
- Replaces `the student` with first name or `your child`.
- Rewrites `disruption` phrasing into softer alternatives.
- Normalises `Dear Parent(s),` to `Dear Parent/Carer,`.

Rationale:
- Best inference: improve readability, correct grammar, and make parent-facing language feel less institutional.

Risk vs Policy 1:
- Medium.
- Most of these changes are small, but they are still content edits.
- The `disruption` replacements and automatic first-name insertion go beyond punctuation cleanup.

Fix:
- Keep grammar repair, but gate semantic rewrites behind teacher-notes mode.
- For teacher-draft mode, avoid inserting names or paraphrasing issue nouns unless explicitly requested.

Implementation risk:
- Medium.

### 13. English register correction and spelling normalisation rewrite wording after generation
File: `app/api/draft/generate/route.ts:2831-2837`, `lib/draft/register-accuracy.ts:116-155`

Trigger:
- English `teacher_draft` mode for `applyTeacherDraftRegisterNormalisation(...)`.

Behaviour:
- Replaces banned register phrases such as `touch base`, `circle back`, `utilize`.
- Normalises spellings such as `behavior` -> `behaviour`, `color` -> `colour`.

Rationale:
- Best inference: remove corporate/American phrasing and move the draft toward school-appropriate British-English register.

Risk vs Policy 1:
- Medium to low.
- This is intentional rewriting of wording, but the changes are mostly stylistic and limited compared with the fallback/template stages.

Fix:
- If Policy 1 is strict, move these to warnings or optional corrections.
- If Policy 1 allows low-risk copy edits, this stage may remain acceptable.

Implementation risk:
- Low.

### 14. English output sanity pass normalises subject, greeting, signoff, and tone details
File: `app/api/draft/generate/route.ts:3058-3066`, `lib/draft/english-output-sanity.ts:346-363`

Trigger:
- Any English parent-message finalisation.

Behaviour:
- Normalises subject punctuation.
- Normalises greeting punctuation.
- Normalises signoff punctuation.
- Applies some tone/reference agreement polishing.

Rationale:
- Best inference: final polish to avoid malformed email structure.

Risk vs Policy 1:
- Medium to low.
- Usually cosmetic, but still a post-generation rewrite layer.

Fix:
- Limit to punctuation-only repairs in teacher-draft mode.

Implementation risk:
- Low.

### 15. German parent-message normaliser reconstructs structure and neutralises judgemental terms
File: `app/api/draft/generate/route.ts:3006-3025`, `lib/draft/german-normalizer.ts:84-140`

Trigger:
- German parent-message output or German UI locale.

Behaviour:
- Rebuilds `Betreff`.
- Re-splits body paragraphs.
- Re-parses closing block.
- Neutralises judgemental terms.

Rationale:
- Best inference: make German outputs structurally consistent and safer in tone.

Risk vs Policy 1:
- Medium.
- This is a structural reconstruction stage, not just punctuation cleanup.
- It can move or reformat content even when the meaning is unchanged.

Fix:
- Restrict German normalisation to malformed-output repair rather than unconditional finalisation.

Implementation risk:
- Medium.

## Lower Impact

### 16. Duplicate-greeting and title safeguards still rewrite greeting presentation
File: `app/api/draft/generate/route.ts:1060-1087`, `app/api/draft/generate/route.ts:1613-1652`

Trigger:
- Greeting duplication near top of output.
- English titled surname greeting missing title.

Behaviour:
- Removes duplicate greeting instances.
- Upgrades bare-surname greeting to titled greeting.

Rationale:
- Best inference: clean structural duplication and avoid socially awkward greetings.

Risk vs Policy 1:
- Low to medium.
- Usually beneficial, but still an override.

Fix:
- Keep as repair-only safeguards.
- For teacher-draft mode, only run if the generated output is malformed relative to the source.

Implementation risk:
- Low.

### 17. Client preview and copy/export layout re-parse the final draft text into subject/body/signature sections
File: `components/draft-output.tsx:259-336`, `lib/export/layout.ts:64-97`, `lib/export/pdf.ts:203-260`, `lib/export/docx.ts:135-170`, `app/api/export/pdf/route.ts:61-74`, `app/api/export/docx/route.ts:98-117`

Trigger:
- Any draft preview.
- Any copy/PDF/DOCX export.

Behaviour:
- Parses `draftText` into subject, body paragraphs, and signature.
- Reconstructs clipboard/export layout from parsed components.
- Export routes now use literal `draftText.trim()` as input.

Rationale:
- Best inference: display and export want structured rendering rather than raw plain text.

Risk vs Policy 1:
- Low in current branch state.
- The current preview/export paths no longer inject `metadata.signatureBlock`; they derive from `draftText`.
- Remaining risk is mostly formatting/reflow, not auth/profile override.

Fix:
- Keep using `draftText` as source of truth.
- Avoid any future fallback to server metadata for subject/signature rendering.

Implementation risk:
- Low.

### 18. Metadata still persists `signatureBlock` as if it were authoritative
File: `app/api/draft/generate/route.ts:3975`, `app/api/draft/generate/route.ts:4106`

Trigger:
- Every successful route response and snippet persistence path.

Behaviour:
- Emits and persists `signatureBlock` derived from either source teacher closing or resolved signature metadata.

Rationale:
- Best inference: analytics/history/export wanted a structured signoff field.

Risk vs Policy 1:
- Low today, medium long-term.
- The main UI/export paths no longer consume this field as authoritative, but its presence increases future regression risk.

Fix:
- Mark this metadata as non-authoritative, or remove it for teacher-draft mode.

Implementation risk:
- Low to medium.

## Existing Preservation Counterweights

These are not override stages, but they matter because they already push the pipeline back toward Policy 1 in some cases.

### A. Teacher-draft no-change path
File: `app/api/draft/generate/route.ts:2952-2975`, `app/api/draft/generate/route.ts:821-888`

Behaviour:
- If a teacher draft already looks strong and low-risk, the route skips model generation and returns a lightly normalised source version.

Effect:
- Strongest existing Policy 1 protection for short, safe drafts.

### B. Light-edit source preservation
File: `app/api/draft/generate/route.ts:3393-3417`

Behaviour:
- If drift assessment says the generated rewrite moved too far from the source in light-edit mode, the route restores the source draft.

Effect:
- Important mitigation, but only after several earlier rewrite stages have already happened.

### C. Worse-than-source snapback
File: `app/api/draft/generate/route.ts:3615-3663`

Behaviour:
- If teacher-draft quality evaluation says the generated output is worse than the source, the route snaps back to the source draft.

Effect:
- Strong preservation backstop, but it is late in the pipeline and does not stop earlier synthetic fallback attempts.

### D. Teacher-draft signature preservation
File: `app/api/draft/generate/route.ts:3420-3443`, `app/api/draft/generate/route.ts:3843-3848`, `app/api/draft/generate/route.ts:629-741`

Behaviour:
- Re-applies source teacher signoff to the final draft and deduplicates matching closings.

Effect:
- This branch now handles the specific Shereen signoff regressions substantially better, but only for signoffs, not for broader content drift.

## Summary

The pipeline contains two different kinds of normalisation:

1. Safety- and quality-motivated rewrites
- Output safety rewrites
- Teacher-draft quality/professional-judgement retries
- Trust-grade and authenticity repairs

2. Product-format and UX normalisation
- Greeting resolution and enforcement
- Subject synthesis
- Signature canonicalisation
- Deterministic fallback templates
- Register/spelling polish

The highest-risk conflicts with Policy 1 are the stages that can replace a teacher-authored draft with synthetic template text:
- prompt-level canonical email framing
- deterministic fallbacks
- minimum-output recovery
- generic recovery replacement
- teacher-authenticity and quality/professional-judgement retries

The lower-risk conflicts are mostly formatting and copy-edit normalisers:
- subject/greeting/signoff punctuation
- British spelling
- pronoun/reference cleanup
- export/display re-parsing

If Policy 1 becomes the governing rule for `teacher_draft` mode, the most important future change is not a single bug fix. It is architectural: split "compose a fresh parent message from notes" from "preserve and lightly revise my existing draft", then narrow each fallback/rewrite stage so only the first mode is allowed to synthesise new content.
