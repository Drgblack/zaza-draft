# Stage 1 Diagnosis

## 1. Current behaviour map

### 5.1 Greeting policy

| Rule | Honoured at | Violated at | Risk level |
|------|-------------|-------------|------------|
| 5.1 Greeting policy | `app/api/draft/generate/route.ts:508-556` `extractTeacherDraftGreetingLine()` extracts a teacher-authored greeting from the draft itself. `app/api/draft/generate/route.ts:1938-1955` in `POST()` gives that source greeting priority for `teacher_draft`. `lib/ai/provider.ts:952-989` in `buildSystemPrompt()` tells the model to keep an upstream-resolved greeting unchanged. | `app/api/draft/generate/route.ts:1986-2010` in `POST()` resolves a greeting from raw text when none is present, which conflicts with “if no greeting is present, do not generate one”. `app/api/draft/generate/route.ts:2013-2024` runs `enforceTitledGreetingSafeguard()` and forces `greetingFinal` for parent messages. `lib/draft/final-greeting.ts:48-94` `enforceGreetingLine()` and `applyFinalGreetingGuard()` overwrite the opening line with the resolved greeting. `lib/ai/provider.ts:925-927` explicitly instructs German parent messages to begin with a polite greeting when none exists. | High |

### 5.2 Signoff policy

| Rule | Honoured at | Violated at | Risk level |
|------|-------------|-------------|------------|
| 5.2 Signoff policy | `app/api/draft/generate/route.ts:467-489` `extractTeacherDraftClosing()` preserves explicit multi-line closing blocks from the teacher draft. `app/api/draft/generate/route.ts:2209-2238` in `POST()` resolves signoff state from the source draft only when `inputIntent === "teacher_draft"`, which prevents auth-profile injection on that path. `app/api/draft/generate/route.ts:579-620` `preserveTeacherDraftSignature()` and `app/api/draft/generate/route.ts:3370-3393` `preserveTeacherDraftSignatureIfNeeded()` re-apply the source signoff. | `lib/ai/provider.ts:789-799` in `buildSystemPrompt()` tells the model not to produce its own closing because a canonical downstream closing will be added. `app/api/draft/generate/route.ts:2556` and `lib/ai/provider.ts:1106-1107` still pass `signatureBlock` into prompt context. `app/api/draft/generate/route.ts:2749-2777` `normalizeClosingForMode()` and `finalizeDraftWithSignature()` canonicalise the closing block rather than preserving verbatim layout. `lib/draft/ensure-single-signoff.ts:114-159` strips inline signoffs and rebuilds canonical closing blocks, which conflicts with the new philosophy rule that explicit signoffs should be preserved verbatim. | Medium |

### 5.3 Subject line policy

| Rule | Honoured at | Violated at | Risk level |
|------|-------------|-------------|------------|
| 5.3 Subject line policy | `lib/draft/subject-policy.ts:152-159` `resolveDraftSubject()` preserves an explicit subject from `contextSubject` or an existing non-fallback subject. `lib/draft/subject-policy.ts:201-203` `applyModeAwareSubjectLine()` leaves the text unchanged when the existing subject already matches the resolved subject. | `lib/ai/provider.ts:772-776` in `buildSystemPrompt()` instructs every parent-facing draft to include a concise subject line. `app/api/draft/generate/route.ts:2997-3006` in `finalizeAndFormatDraft()` always applies `applyModeAwareSubjectLine()` unless the no-change path short-circuits. `lib/draft/subject-policy.ts:162-168` and `206-208` derive and inject a subject when none exists, which directly violates “leave the subject field blank”. `lib/draft/fallback.ts:96-119` and `515-525` synthesise canned fallback subjects such as `Subject: Update on homework`. | High |

### 5.4 Structural preservation

| Rule | Honoured at | Violated at | Risk level |
|------|-------------|-------------|------------|
| 5.4 Structural preservation | `app/api/draft/generate/route.ts:784-862` `shouldUseTeacherDraftNoChangePath()` prevents generation for short, low-risk drafts. `app/api/draft/generate/route.ts:1326-1371` `assessLightEditDrift()` measures similarity and expansion, and `app/api/draft/generate/route.ts:3343-3368` `preserveLightEditSourceIfNeeded()` snaps back to source when drift is too large in light-edit mode. `lib/draft/quality-evaluation.ts:392-393` flags >40% expansion, and `app/api/draft/generate/route.ts:3565-3613` snaps back when output is worse than source. | `lib/ai/provider.ts:859-899` and `900-905` in `buildSystemPrompt()` authorise rewrite, restructuring, and intent inference rather than sentence-level preservation. `lib/ai/provider.ts:961-973` imposes canonical paragraph expectations. `app/api/draft/generate/route.ts:2733-2743` `finalizeDraft()` and `2734-2738` `enforceTeacherNameStyle()` can rewrite references and insert names. `app/api/draft/generate/route.ts:2997-3016` adds subjects and runs final English sanity passes. `app/api/draft/generate/route.ts:3101-3157`, `3158-3173`, `3311-3333`, and `3712-3761` replace collapsed or low-quality drafts with synthetic fallback content. There is no hard enforcement of sentence count, paragraph count, ±30% word count, or named-entity preservation. | High |

### 5.5 Minimal edits

| Rule | Honoured at | Violated at | Risk level |
|------|-------------|-------------|------------|
| 5.5 Minimal edits | `app/api/draft/generate/route.ts:2907-2918` returns copy-edit-only output on the no-change path. `app/api/draft/generate/route.ts:3343-3368` preserves the source draft in light-edit mode when drift is too large. `app/api/draft/generate/route.ts:2781-2787` limits automatic teacher-draft register normalisation to word-level corrections. | `lib/ai/provider.ts:844-849`, `862-868`, and `873-897` instruct broad rewrites for authenticity, quality, and professional-judgement concerns. `lib/ai/provider.ts:900-905` tells the model not to repeat source wording and to infer intent. `app/api/draft/generate/route.ts:3305-3333` performs authenticity fallback. `app/api/draft/generate/route.ts:3470-3499` re-runs the draft for output safety. `app/api/draft/generate/route.ts:3615-3761` performs full teacher-draft quality and professional-judgement regenerations and can fall back to a boutique synthetic draft. These are transformative operations, not minimal edits. | High |

### 5.7 Fallback behaviour

| Rule | Honoured at | Violated at | Risk level |
|------|-------------|-------------|------------|
| 5.7 Fallback behaviour | `app/api/draft/generate/route.ts:2907-2918` no-change path returns the teacher’s own draft. `app/api/draft/generate/route.ts:3593-3603` worse-than-source detection snaps back to the source draft. `app/api/draft/generate/route.ts:3763-3789` falls back to copy-edit-only when the synthetic fallback also fails quality. | `lib/draft/fallback.ts:1281-1324` `generateDraftWithFallback()` immediately returns synthetic recovery text on provider failure. `app/api/draft/generate/route.ts:1439-1442` `buildRouteFallbackDraft()` returns source-grounded or generic fallback content. `app/api/draft/generate/route.ts:3101-3157` `recoverCollapsedParentMessageOutput()` uses fallback drafts and then a deterministic template. `app/api/draft/generate/route.ts:2647-2727` `buildSourceGroundedRecoveryDraft()` replaces current output with generated recovery text. `app/api/draft/generate/route.ts:3311-3333` and `3712-3761` accept synthetic fallback drafts in teacher-draft mode. | Very high |

## 2. Proposed Stage 1 changes

### 2.1 Prompt-level framing for `teacher_draft` mode

- File and function:
  - [lib/ai/provider.ts](C:/Users/User/Projects/zaza-draft/lib/ai/provider.ts): `buildSystemPrompt()`
- Intended change:
  - Add a dedicated `teacher_draft` prompt branch that frames the task as preservation with bounded edits.
  - Remove subject-generation instructions for `teacher_draft`.
  - Remove canonical-closing assumptions for `teacher_draft`.
  - Remove instructions telling the model to infer intent, avoid repeating source wording, or restructure the message for quality reasons.
  - Keep safety-floor instructions and named-exception framing only.
- Risk to existing passing tests:
  - Medium. Prompt changes will alter route-test outputs wherever tests currently assume canonical email shaping in teacher-draft flows.
- New tests required:
  - `lib/ai/provider.test.ts`
  - `it("uses preservation-first instructions for teacher_draft mode and does not instruct subject or canonical closing generation")`

### 2.2 Greeting preservation guardrail

- File and function:
  - [app/api/draft/generate/route.ts](C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts): `POST()`, greeting resolution block around `1938-2026`, and finalisation path using `applyFinalGreetingGuard()`
  - [lib/draft/final-greeting.ts](C:/Users/User/Projects/zaza-draft/lib/draft/final-greeting.ts): `applyFinalGreetingGuard()`
- Intended change:
  - In `teacher_draft` mode, only treat a greeting as authoritative if it came from the source draft itself.
  - If the teacher draft has no greeting, do not resolve one from raw text and do not enforce one downstream.
  - Add a post-generation guard that restores the source greeting verbatim if the generated output changes it.
- Risk to existing passing tests:
  - Medium. Existing greeting-resolution and fallback tests that assume `Dear Parent/Carer,` can appear in teacher-draft flows will need updating.
- New tests required:
  - `app/api/draft/generate/route.test.ts`
  - `it("preserves a teacher-authored greeting verbatim in teacher_draft mode")`
  - `it("does not generate a greeting when the teacher draft has none")`

### 2.3 Subject line preservation guardrail

- File and function:
  - [app/api/draft/generate/route.ts](C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts): `finalizeAndFormatDraft()`
  - [lib/draft/subject-policy.ts](C:/Users/User/Projects/zaza-draft/lib/draft/subject-policy.ts): `resolveDraftSubject()` and `applyModeAwareSubjectLine()`
- Intended change:
  - In `teacher_draft` mode, preserve an explicit source subject verbatim.
  - If the teacher draft has no subject, keep the subject blank and skip derived-subject generation entirely.
  - Treat subject synthesis as unavailable on implicit route passes for `teacher_draft`.
- Risk to existing passing tests:
  - High. The current subject-policy suite and several route tests assume all parent-facing drafts receive a subject.
- New tests required:
  - `app/api/draft/generate/route.test.ts`
  - `it("preserves an explicit subject line verbatim in teacher_draft mode")`
  - `it("does not generate a subject line when the teacher draft has none")`

### 2.4 Signoff preservation guardrail verification

- File and function:
  - [app/api/draft/generate/route.ts](C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts): `extractTeacherDraftClosing()`, `preserveTeacherDraftSignature()`, `normalizeClosingForMode()`
  - [lib/draft/ensure-single-signoff.ts](C:/Users/User/Projects/zaza-draft/lib/draft/ensure-single-signoff.ts): `normalizeClosingBlock()`
- Intended change:
  - Keep the existing no-profile-injection behaviour.
  - Narrow downstream normalisation so an explicit teacher signoff block is preserved verbatim rather than reserialised into canonical punctuation or line-break form.
  - Keep “no signoff means no signoff” intact.
- Risk to existing passing tests:
  - Low to medium. Most recent signoff tests align with the new philosophy, but any tests that still assume canonical `Kind regards,` formatting will need updating.
- New tests required:
  - `app/api/draft/generate/route.test.ts`
  - `it("preserves a teacher-authored signoff block verbatim in teacher_draft mode")`

### 2.5 No-synthetic teacher-draft fallback

- File and function:
  - [app/api/draft/generate/route.ts](C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.ts): `recoverCollapsedParentMessageOutput()`, `buildSourceGroundedRecoveryDraft()`, teacher-authenticity fallback block, teacher-draft quality fallback block
  - [lib/draft/fallback.ts](C:/Users/User/Projects/zaza-draft/lib/draft/fallback.ts): `generateDraftWithFallback()`
- Intended change:
  - For `teacher_draft` mode only, all provider-fallback, collapsed-output recovery, generic recovery, authenticity fallback, and low-confidence fallback paths must return the source draft with bounded copy-editing rather than synthetic email content.
  - Keep synthetic fallback behaviour available for notes-to-parent `parent_message` flows.
- Risk to existing passing tests:
  - High. Several route tests currently expect source-grounded fallback, boutique fallback, or minimum-output template recovery in teacher-draft mode.
- New tests required:
  - `app/api/draft/generate/route.test.ts`
  - `it("returns the teacher source draft instead of synthetic fallback content when provider fallback is triggered in teacher_draft mode")`
  - `it("returns the teacher source draft instead of template recovery when minimum-output recovery is triggered in teacher_draft mode")`

## 3. Test plan

- File: `app/api/draft/generate/route.test.ts`
  - `it("preserves a teacher-authored greeting verbatim in teacher_draft mode")`
- File: `app/api/draft/generate/route.test.ts`
  - `it("does not generate a greeting when the teacher draft has none")`
- File: `app/api/draft/generate/route.test.ts`
  - `it("preserves an explicit subject line verbatim in teacher_draft mode")`
- File: `app/api/draft/generate/route.test.ts`
  - `it("does not generate a subject line when the teacher draft has none")`
- File: `app/api/draft/generate/route.test.ts`
  - `it("preserves a teacher-authored signoff verbatim in teacher_draft mode")`
- File: `app/api/draft/generate/route.test.ts`
  - `it("returns the source draft with minimal edits and no synthetic content when a teacher_draft fallback path is triggered")`
- File: `app/api/draft/generate/route.test.ts`
  - `it("applies a safety override in teacher_draft mode while preserving the original greeting, subject, and signoff")`
- File: `lib/ai/provider.test.ts`
  - `it("builds a preservation-first teacher_draft prompt with no implicit subject or canonical closing instructions")`

## 4. Risks and unknowns

- Rule 5.4 does not map to a clear Stage 1 implementation because the current pipeline has no hard post-generation enforcement for sentence count, paragraph count, named entities, or ±30% length. Those are Stage 2 concerns.
- Rule 5.5 cannot be fully guaranteed by Stage 1 either. Prompt framing and fallback restriction will reduce drift, but the route still contains safety and quality rewrite machinery that can produce structural changes until Stage 2 and Stage 3 work happens.
- Stage 1 greeting work will conflict with the current generic-greeting machinery in `POST()` and `applyFinalGreetingGuard()`. That is intentional, but it means some existing parent-message route tests may need clearer separation between `teacher_draft` and notes-to-parent cases.
- Stage 1 subject work will break existing tests that assume every parent-facing draft receives a subject. The most obvious conflicts are in the `/api/draft/generate subject policy` block in [route.test.ts](C:/Users/User/Projects/zaza-draft/app/api/draft/generate/route.test.ts) around lines `4386+`, plus tests asserting `Subject: Update on homework` in teacher-draft paths around `4494-4495`.
- Stage 1 fallback work will break existing tests that explicitly expect teacher-draft synthetic fallback models such as `teacher-draft-boutique-fallback`, `minimum-output-fallback`, or source-grounded template recovery. The route tests around `2705`, `2766`, `2835`, `4575`, and `4615` are the highest-risk candidates.
- `lib/draft/scope-guard.ts` does not appear to require a Stage 1 change. It gates whether the request is in scope, but it does not implement the teacher-draft preservation contract itself.
- Open question: should an explicit subject line be recognised only when it is part of the pasted draft text, or also when the UI supplies `contextSubject` separately in `teacher_draft` mode?
- Open question: when no subject exists, should the response surface `formattedDraft.subject` as an empty string or `undefined`? The philosophy requires “blank”, but the response contract may need a single canonical representation.
- Open question: if a teacher writes unsafe language inside a greeting or signoff line, does the safety override have permission to edit that line, or should the route fail closed and return the source draft with a warning? The philosophy implies safety takes precedence, but the exact UI/response behaviour is not yet specified.

## 5. Proposed sequencing

1. Implement the subject-line guardrail in `route.ts` and `subject-policy.ts`.
   Rationale: this is the most deterministic Stage 1 change. It has clear pass/fail behaviour and removes one of the most visible synthetic additions without depending on model behaviour.

2. Implement the greeting guardrail in `route.ts` and `final-greeting.ts`.
   Rationale: once subject synthesis is disabled, greeting synthesis becomes the next most visible authored-content override. This change is still deterministic and easy to verify with route tests.

3. Tighten signoff preservation in `route.ts` and `ensure-single-signoff.ts`.
   Rationale: the signoff path is already largely aligned, so this is a smaller follow-up that should stabilise the authored-envelope behaviour before broader prompt changes.

4. Change `teacher_draft` prompt framing in `lib/ai/provider.ts`.
   Rationale: once deterministic route guardrails are in place, prompt changes become safer because the route already prevents the most obvious subject, greeting, and signoff regressions. This also makes prompt regressions easier to isolate.

5. Replace synthetic teacher-draft fallback behaviour with source-preserving degradation.
   Rationale: this is the highest-risk Stage 1 change and will cause the largest test churn. It should land last, after the authored-envelope rules are locked down, so verification can focus on recovery behaviour without reopening greeting, subject, or signoff questions.
