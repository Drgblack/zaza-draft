# 1. Purpose

This document defines the product philosophy for Zaza Draft. It is the reference point for implementation decisions, test design, and product decisions relating to draft generation, with particular force in `teacher_draft` mode.

It records the operating conclusions of the April-May 2026 pipeline normalisation audit and turns those conclusions into explicit product rules. Where implementation behaviour, test expectations, or future feature proposals conflict with this document, this document is the source of truth until it is explicitly revised.

# 2. Core position

Zaza Draft is a co-pilot, not a ghostwriter. Safety is a floor, not a stylistic ceiling.

Zaza Draft exists to support teacher judgement, not to replace it. In `teacher_draft` mode, the teacher has already authored a message and the product contract is preservation with bounded help. The system may correct surface errors, identify communication risk, and make the draft safer to send, but it does not take ownership of the message. The teacher remains the author, the owner of the intent, and the final decision-maker.

That distinction matters because a drafted parent message is not raw source material for a new composition. It is an authored communication. If the system treats it as a prompt for a fresh rewrite, it breaks the authorship contract. Greetings, signoffs, structure, chosen names, and phrasing that carries meaning are not decorative details. They are part of the teacher's authored message and must be treated as such.

The role of a co-pilot is therefore narrow and accountable. Zaza surfaces risk, offers support, and applies bounded changes that keep the teacher's message intact. It does not silently substitute a different professional voice, generalise specific names, add relationship language that was never written, or compose fallback content that the teacher did not author.

Safety is the minimum standard the product must guarantee, not a licence for stylistic intervention. The system must automatically intervene when a draft contains risk-bearing language as defined by the Communication Safety Engine. That is the floor. The system must not then continue intervening in order to optimise warmth, polish, professionalism, or authenticity when the teacher's own wording is already safe to send.

This distinction prevents style drift. A draft can be direct, brief, plain, awkward, or minimally warm and still be acceptable if it is safe and faithful to the teacher's meaning. Automatic style expansion, tonal smoothing, and message enrichment create trust failures because they move the product from correction into authorship. In `teacher_draft` mode, those interventions are advisory concerns, not automatic transformations.

For this reason, the product does not treat "better sounding" output as a success condition in authored-draft flows. The success condition is a recognisably preserved teacher message with risk neutralised where necessary. Anything beyond that belongs in a suggestion layer chosen by the teacher, not in silent pipeline behaviour.

# 3. The two-mode architectural distinction

Zaza Draft operates in two distinct modes:

- **teacher_draft mode**: the teacher has written a draft. The system preserves it and applies bounded edits. The output is recognisably the teacher's message.
- **parent_message mode**: the teacher has provided notes or context. The system generates a message on the teacher's behalf. The output is professionally composed by the system using the teacher's input as source material.

These modes have fundamentally different contracts with the user, and the system must enforce that distinction explicitly. In `teacher_draft` mode, preservation is the default and transformation is the exception. In `parent_message` mode, composition is the default and fidelity is measured against source facts and intent rather than sentence-level preservation.

The system must not blur these contracts internally. A teacher-authored email cannot be routed through generation and fallback logic designed for note-to-message composition without creating trust failures. A note-based parent message cannot be constrained by authored-draft preservation rules without reducing the usefulness of the product. The system must therefore maintain mode-specific prompts, safeguards, fallback behaviour, and tests.

Blending the two modes is the root cause of the trust failures identified in the audit. When `teacher_draft` flows inherit normalisers, signoff generators, subject synthesis, or recovery templates from `parent_message` flows, the system overrides authored content and produces messages the teacher did not write. The architectural boundary is therefore a product requirement, not an implementation preference.

# 4. What is sacred in teacher_draft mode

Three categories of content are sacred in `teacher_draft` mode and must be preserved.

- **Structure**: greeting, signoff, sentence count, paragraph count, overall message length.
- **Intent**: the message's core purpose, including informing, requesting, warning, apologising, clarifying, or documenting. The system never inverts or reframes intent.
- **Authorship**: the teacher's voice, named entities such as student names and specific incidents, the teacher's chosen subject line, and the teacher's specific phrasing where it carries meaning.

Structure is not a cosmetic wrapper. A short, direct message is a deliberate communication choice. A one-paragraph draft and a three-paragraph draft are materially different acts of communication. Preserving structure protects both the teacher's effort and the teacher's communicative judgement.

Intent is the message's governing meaning. If a teacher intends to notify, the system must not escalate that into a warning. If a teacher intends to ask for support, the system must not turn that into an accusation. If a teacher intends to apologise, the system must not harden that into a boundary-setting message. Intent preservation is required even when the wording changes for safety reasons.

Authorship is what makes the message recognisably the teacher's. Specific names, incidents, dates, and concrete classroom details anchor trust. So do phrasing choices such as whether the teacher says "Thanks", "Kind regards", or nothing at all. Replacing those authored markers with system-preferred language weakens trust even when the factual content survives.

# 5. Operationalised rules

## 5.1 Greeting policy

- If the teacher's draft contains a plausible greeting (e.g. "Mrs Smith,", "Dear Mr Jones,", "Hi Sarah,"), preserve it verbatim. Do not normalise to "Dear Parent/Carer" or any other canonical form.
- If no greeting is present, do not generate one.

## 5.2 Signoff policy

- If the teacher's draft contains a plausible signoff (e.g. "Thanks, Greg", "Kind regards, Shereen P.", "Best wishes, Mr Blackburn"), preserve it verbatim, including punctuation and line breaks.
- If no signoff is present, do not auto-inject one. Specifically, do not use the authenticated user's profile name to generate a signoff.

## 5.3 Subject line policy

- If the teacher provides a subject line, preserve it verbatim.
- If the teacher does not provide a subject line, do not generate one. Leave the subject field blank.
- A future "generate subject" action may be introduced as an explicit user-initiated operation. It must never run implicitly.

## 5.4 Structural preservation

- Sentence count of the output must match the sentence count of the input, except where a named exception applies (see 5.6).
- Paragraph count of the output must match the paragraph count of the input.
- Overall word count of the output must remain within ±30% of the input word count.
- Named entities (student names, incidents, dates, specific events) present in the input must appear in the output.

These rules are contractual. They exist so that authored drafts remain recognisable after processing. A teacher reviewing the result must be able to map the output directly to the draft they wrote without discovering added structure, missing facts, or silently generalised content.

## 5.5 Definition of "minimal edits"

A minimal edit is a change that does not alter the structure of the teacher's writing. Specifically:

- Spelling corrections: allowed.
- Grammar corrections (subject-verb agreement, comma splices, missing articles): allowed.
- Word substitutions for clarity within a sentence: allowed if the substitution does not change the sentence's primary subject, verb, or object.
- Sentence restructuring: forbidden by default.
- Sentence merging or splitting: forbidden by default.
- Paragraph restructuring: forbidden by default.
- Tone rewriting (e.g. softening "you need to" to "could you"): forbidden by default.

The total volume of word-level changes should not exceed approximately 10% of the input word count, except where a named exception applies.

The mental model: the teacher should still see their own sentences in the output, with small changes inside them. They should not see new sentences.

Minimal edits are therefore local edits, not compositional edits. They repair surface defects while preserving the teacher's authored structure. They do not relocate meaning between sentences, add prefatory warmth, insert bridging statements, or convert short direct language into a longer professionally shaped message.

## 5.6 Named exceptions to minimal edits

Two categories of edit are permitted to exceed the minimal-edits boundary:

- **Safety override**: sentences containing risk-bearing language (as defined by the Communication Safety Engine signals) may be modified to neutralise the risk, including restructuring if necessary. The safety override is automatic.
- **Clarity override**: a single run-on sentence (defined as a sentence exceeding 40 words or containing 3+ independent clauses) may be split into two sentences, provided no other change is made to the resulting content. The clarity override is automatic but capped at one application per draft.

Any operation that triggers a named exception must be logged as a transformation event, distinct from a polish event, for later review.

These exceptions are narrow on purpose. They authorise deviation only when the draft would otherwise create communication risk or clear readability failure. They do not authorise general polishing, tonal enrichment, or opportunistic rewrites justified only by a model preference for a different style.

## 5.7 Fallback behaviour in teacher_draft mode

If any pipeline step fails or produces low-confidence output:

- Return the teacher's original draft.
- Apply only the minimal edits defined in 5.5.
- Never generate synthetic email content as a fallback.
- Never substitute a template message for the teacher's content.

Fallback behaviour in `teacher_draft` mode must degrade safely toward preservation, not toward authorship. A broken generation stage, failed retry, low-confidence scorer, or missing downstream component does not create permission to compose a new message. The safest degraded state is the teacher's own draft with bounded surface correction.

This rule applies to all recovery paths in `teacher_draft` mode, including fallback, retry, generic recovery, and minimum-output recovery. None of those paths may switch from source preservation to synthetic template generation.

## 5.8 Clarifying implementation decisions

- **Subject source**: in `teacher_draft` mode, an explicit subject can come from either a `Subject:` line in the pasted draft text or a non-empty `contextSubject` value supplied by the UI. Both count as teacher-authored subject choices and must be preserved. If both are empty, the system must not synthesise a subject.
- **Empty subject representation**: when no subject exists in `teacher_draft` mode, represent the subject as an empty string (`""`) rather than `undefined`. This means the system intentionally leaves the subject blank.
- **Unsafe language in greeting or signoff**: if risk-bearing language appears inside a greeting or signoff, the safety override takes precedence over verbatim preservation. The system may edit the unsafe phrase, but it must preserve as much of the original structure as possible, log the change as a transformation event rather than a polish event, avoid rewriting the rest of the draft, and ideally surface a visible note to the teacher that the greeting or signoff was changed for safety reasons.

# 6. Advisory vs transformative: future direction

The long-term product direction separates two layers:

- **Automatic interventions**: limited to safety-floor operations (neutralising risk-bearing language) and the named exceptions in 5.6.
- **Advisory feedback**: quality, tone, professional-judgement, and authenticity concerns are surfaced to the teacher as suggestions. The teacher decides whether to act on them. The system does not transform the draft based on these concerns.

This distinction is a future direction, not an immediate implementation target. Stage 1 of the realignment work focuses on prompt-level framing and structural guardrails. The advisory-feedback redesign is a later phase requiring UX changes.

The purpose of this direction is to separate judgement from authorship. The system may detect that a draft is abrupt, overly vague, professionally risky, or likely to invite an unhelpful reply. Those observations are valuable. They should inform the teacher. They should not silently rewrite the teacher's message unless a rule in section 5 authorises the change.

# 7. What this document does NOT cover

This document intentionally does not cover the following areas:

- The full deterministic fallback builder architecture redesign (deferred). This deferral does not suspend the Stage 1 rule in section 5.7. The Stage 1 no-synthetic-fallback guard in `teacher_draft` mode is not deferred. In `teacher_draft` mode, fallback, retry, generic recovery, and minimum-output recovery paths must degrade toward source preservation, not template generation. Synthetic fallback behaviour may remain available for notes-to-parent / `parent_message` mode.
- The full minimum-output recovery redesign (deferred). This deferral does not suspend the Stage 1 rule in section 5.7. The Stage 1 no-synthetic-fallback guard in `teacher_draft` mode is not deferred. In `teacher_draft` mode, minimum-output recovery must preserve the teacher's source draft rather than generate synthetic email content.
- Locale-specific normalisers, including the German normaliser (deferred).
- Preview, export, and metadata handling (already in acceptable state).
- The teacher-authenticity, quality, and professional-judgement layers (deferred pending the advisory-feedback redesign).

# 8. How this document is used

- Implementation work in `teacher_draft` mode must conform to the rules in section 5.
- Test cases must verify the rules in section 5.
- Future product decisions about `teacher_draft` behaviour must reference this document.
- Changes to this document require explicit founder review.
