# Appendix F — Trust-Grade Draft Orchestration & Quality Contract

## Purpose

This addendum defines the **non-negotiable behavioural guarantees** required for Zaza Draft to meet the Zaza brand promise:

> "A boutique, trust-first co-writer for teachers."

These rules apply across all features:
- **Safe Draft** (text-based generation)
- **Panic Scan** (OCR-enriched generation)
- **Voice-to-Calm** (voice-input generation)

Supported locales: **EN-GB** and **DE-DE**

### Core Philosophy

Zaza Draft prioritizes **predictability, emotional safety, and professional credibility** over stylistic freedom. This document intentionally constrains model discretion in areas that directly impact teacher trust.

**Key principle**: Any behaviour that compromises accountability, clarity, empathy, identity, or linguistic safety is considered a **blocking defect**, even if tests pass.

---

## 1. Definition of Done (DoD): Trust-Grade Behaviour

A feature is **not complete** unless all conditions below are satisfied.

### ✅ Language & Locale (Non-Negotiable)

**Rule**: UI locale is the **single source of truth** for output language.

| Scenario | UI Locale | Input Language | Output Language |
|----------|-----------|----------------|-----------------|
| German UI with English parent email | `de-DE` | English | **German** |
| English UI with German screenshot | `en-GB` | German | **English** |
| German UI with mixed-language message | `de-DE` | Mixed | **German** |

**Enforcement**:
- Draft language MUST follow UI locale, never message language
- Panic Scan analysis MUST follow UI locale
- Message language detection is for context only, never for output determination

**Validation**: Every generated draft must be validated against `DraftContext.locale` before returning to UI.

---

### ✅ Required Rhetorical Anchors

If the following data exists in context, it **must** be used in the generated draft:

| Field | Requirement | Validation Rule (Phase 1) |
|-------|-------------|---------------------------|
| `childName` | Must appear at least once in body text | Case-insensitive string inclusion |
| `teacherName` | Must appear in final sign-off | Exact match in closing block |
| `parentName` | Used in greeting when available | Present in opening salutation |
| `riskLevel` | Must influence tone and structure | Keyword audit (see Section 5) |
| `urgency` | Must affect acknowledgment timing language | Keyword audit (see Section 5) |

**Phase 1 Validation Approach**: Use simple, reliable checks (string inclusion, keyword presence).

**Phase 3 Enhancements** (Optional): Semantic similarity, embeddings, advanced NLP.

**Defect Classification**: Failure to include required anchors when data exists is a **🟡 Repairable failure** (see Section 5).

**Edge Cases**:
- If `childName` is missing → generation may proceed, but validation must not fail
- If `teacherName` is missing → **halt generation** and prompt profile completion
- If `parentName` is missing → use fallback greeting hierarchy (see §3)

---

### ✅ Specificity & Contextual Grounding (Anti-Generic Rule)

**Critical Requirement**: Every draft must demonstrate that the teacher has **read and understood the specific parent concern**, not just generated a template response.

**Specificity Validation (Phase 1)**:

```typescript
function validateSpecificity(draft: string, ctx: DraftContext): SpecificityValidation {
  const issues: string[] = [];
  
  // 1. Parent name must appear in greeting (if available)
  if (ctx.parentName) {
    const greetingPattern = new RegExp(`Dear\\s+${ctx.parentName}`, 'i');
    if (!greetingPattern.test(draft)) {
      issues.push('Parent name missing from greeting');
    }
  }
  
  // 2. Child name must appear in body (if available)
  if (ctx.childName) {
    const bodyOnly = draft.split(/Kind regards|Mit freundlichen Grüßen/i)[0];
    if (!bodyOnly.toLowerCase().includes(ctx.childName.toLowerCase())) {
      issues.push('Child name missing from body text');
    }
  }
  
  // 3. Must contain at least 2 specific details from parent's message
  // Extract nouns/entities from rawMessage that should be referenced
  const parentMessage = ctx.rawMessage || ctx.panicScan?.cleanedMessage || '';
  const specificDetails = extractKeyDetails(parentMessage);
  
  let detailsReferenced = 0;
  specificDetails.forEach(detail => {
    if (draft.toLowerCase().includes(detail.toLowerCase())) {
      detailsReferenced++;
    }
  });
  
  if (detailsReferenced < 2) {
    issues.push('Draft too generic - must reference at least 2 specific details from parent concern');
  }
  
  // 4. Generic phrase detection (forbidden phrases)
  const genericPhrases = [
    'general concern', 'the matter', 'the situation', 'the issue',
    'what you mentioned', 'your message', 'your email',
    'this matter', 'these concerns'
  ];
  
  const lowerDraft = draft.toLowerCase();
  const containsOnlyGeneric = genericPhrases.some(phrase => 
    lowerDraft.includes(phrase) && !containsSpecificReference(draft, parentMessage)
  );
  
  if (containsOnlyGeneric) {
    issues.push('Draft relies on generic phrases without specific context');
  }
  
  return {
    isSpecific: issues.length === 0,
    issues,
    detailsReferenced,
  };
}

// Helper: Extract key entities/details from parent message
function extractKeyDetails(message: string): string[] {
  // Simple extraction: nouns, proper nouns, key phrases
  // Examples: "playground incident", "homework policy", "lunchtime", "PE class"
  // This can be enhanced with NLP in Phase 3
  const details: string[] = [];
  
  // Extract quoted text
  const quotes = message.match(/"([^"]+)"|'([^']+)'/g);
  if (quotes) details.push(...quotes);
  
  // Extract capitalized phrases (proper nouns, places, events)
  const properNouns = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (properNouns) details.push(...properNouns);
  
  // Extract specific time references
  const timeRefs = message.match(/\b(?:yesterday|today|Monday|Tuesday|Wednesday|Thursday|Friday|last week|this morning)\b/gi);
  if (timeRefs) details.push(...timeRefs);
  
  return details.filter((d, i, arr) => arr.indexOf(d) === i); // unique
}
```

**Required Specificity Elements**:

| Element | Requirement | Examples (Good) | Examples (Bad) |
|---------|-------------|-----------------|----------------|
| **Parent name in greeting** | If available, must be used | "Dear Sarah," / "Liebe Frau Schmidt," | "Dear parent," (when name is available) |
| **Child name in body** | If available, must appear at least once | "I'm concerned about Jacob's experience" | "I'm concerned about your child" (when name is available) |
| **Specific issue reference** | Must mention concrete details from parent message | "the incident during PE class on Tuesday" | "the situation you mentioned" |
| **Contextual details** | At least 2 specific references from parent concern | "the homework policy" + "the missing textbook" | Generic phrases only |
| **Concrete next steps** | Must include actionable items, not vague promises | "I will speak with Jacob tomorrow morning and contact you by Friday" | "I will look into this matter" |

**Forbidden Generic Patterns**:

These phrases are **red flags** when used without specific context:

**English (EN-GB)**:
- "Thank you for bringing this to my attention" *(without specifying what)*
- "I understand your concern" *(without naming the concern)*
- "I will look into the matter" *(without identifying the matter)*
- "Your child's wellbeing is important" *(without using child's name)*
- "I'll keep you updated" *(without timeline or method)*

**German (DE-DE)**:
- "Vielen Dank für Ihre Nachricht" *(ohne Spezifik)*
- "Ich verstehe Ihre Sorge" *(ohne die Sorge zu benennen)*
- "Ich werde mich darum kümmern" *(ohne Details)*
- "Das Wohlbefinden Ihres Kindes ist wichtig" *(ohne Kindname)*
- "Ich halte Sie auf dem Laufenden" *(ohne Zeitrahmen)*

**Validation Rule**: If draft contains 2+ forbidden generic phrases without corresponding specific references → 🟡 Repairable failure

**Regeneration Instruction Template**:
```
"The draft is too generic. Must include:
- Parent's name in greeting: '{parentName}'
- Child's name in body: '{childName}'
- Specific reference to: {detail1} and {detail2}
- Concrete next step with timeline (e.g., 'tomorrow morning', 'by Friday')
Avoid generic phrases like 'the matter' or 'the situation' - be specific."
```

**Why This Matters**:
- Parents can immediately tell when a response is templated vs. personalized
- Specific references prove the teacher has engaged with the actual concern
- Builds trust through demonstrated attentiveness
- Prevents the "AI-generated feel" that undermines teacher credibility

#### Specificity Fallback Rule

**Edge Case**: If the parent message contains **fewer than two extractable concrete details**, the system must:

Reference **at least one available element** from:
- Time indicator (e.g., "today", "this morning", "yesterday")
- Emotional signal (e.g., "upset", "concerned", "worried")  
- Message summary from Panic Scan
- General topic area (e.g., "homework", "behaviour", "attendance")

**In these cases**:
- **Do not fail validation** for missing two details
- **Do not fabricate** additional specificity to meet the requirement
- One genuine reference is sufficient

**Example low-detail input**:
> "I'm concerned about my child."

**Acceptable response** (uses emotional signal):
> "Dear [Parent Name],
> 
> Thank you for reaching out. I understand you're concerned about [Child Name]. To ensure I can respond appropriately and address your specific concerns, could you please provide a bit more detail about what's worrying you? For example, is this about something that happened at school, homework, or something else?
> 
> I'm here to help and want to make sure I address the right issue.
> 
> Kind regards,
> [Teacher Name]"

**This prevents hallucination under low-information input.**

---

### ✅ Clarification-First Response (Trust-Preserving Success State)

When the input message **lacks sufficient factual detail**, the system **may generate a clarification-seeking response** rather than fabricate specificity.

**This is an acceptable and encouraged pattern** when:
- Parent message is vague or lacks specific details
- No concrete incident or concern is identifiable
- Risk level is unknown or low

**Example acceptable phrasing**:

**English (EN-GB)**:
- "To ensure I respond appropriately, could you please clarify..."
- "I would appreciate a little more detail about..."
- "Could you help me understand what specifically concerns you about..."
- "I want to make sure I address the right issue—could you tell me more about..."

**German (DE-DE)**:
- "Um angemessen zu antworten, könnten Sie bitte klarstellen..."
- "Ich würde mich über etwas mehr Details freuen zu..."
- "Könnten Sie mir helfen zu verstehen, was Sie konkret besorgt über..."
- "Ich möchte sicherstellen, dass ich das richtige Problem anspreche—könnten Sie mir mehr erzählen über..."

**Critical Rule**: This is considered a **trust-preserving success state**, not a failure.

**Fabrication must never be used to satisfy specificity requirements.**

Better to seek clarification than to invent details that may be incorrect or inappropriate.

---

### ✅ Teacher Voice & Professional Boundaries

**Tone Requirements**:

| Risk Level | Tone Characteristics | Example Language (EN) | Example Language (DE) |
|------------|---------------------|----------------------|---------------------|
| **Low** | Warm, collaborative, solution-focused | "Let's work together on this" | "Lassen Sie uns gemeinsam daran arbeiten" |
| **Medium** | Serious, empathetic, clear action plan | "I take this very seriously and will..." | "Ich nehme dies sehr ernst und werde..." |
| **High** | Immediate, protective, escalation language | "I'm addressing this immediately with..." | "Ich kümmere mich sofort darum mit..." |

**Professional Boundaries** (must be maintained):

1. **No blame assignment**: Never blame parent, child, or other parties explicitly
2. **No promises beyond control**: Avoid "This will never happen again" 
3. **No diagnostic language**: Avoid medical/psychological diagnoses
4. **No legal admissions**: Avoid "It was our fault" or liability language
5. **No emotional over-intimacy**: Maintain professional distance

**Validation (Phase 1 - Keyword Flagging)**:

```typescript
function validateProfessionalBoundaries(draft: string, locale: DraftLocale): BoundaryValidation {
  const warnings: string[] = [];
  
  const problematicPhrases = locale === 'en-GB' ? [
    'it was our fault', 'we are to blame', 'this will never happen again',
    'I guarantee', 'I promise this won\'t', 
    'your child has ADHD', 'seems depressed', 'might have autism',
    'you should have', 'why didn\'t you', 'if you had only'
  ] : [
    'es war unsere schuld', 'wir sind schuld', 'dies wird nie wieder passieren',
    'ich garantiere', 'ich verspreche dass dies nicht',
    'ihr kind hat ADHS', 'scheint deprimiert', 'könnte autismus haben',
    'sie hätten', 'warum haben sie nicht', 'wenn sie nur'
  ];
  
  const lowerDraft = draft.toLowerCase();
  problematicPhrases.forEach(phrase => {
    if (lowerDraft.includes(phrase)) {
      warnings.push(`Boundary violation: "${phrase}"`);
    }
  });
  
  return {
    maintainsBoundaries: warnings.length === 0,
    warnings,
  };
}
```

**If boundary violations detected** → 🟡 Repairable failure with specific correction instruction

---

### ✅ No Moral Judgement Rule

The system must **not assign moral judgement** to the child, parent, or situation.

Language implying **wrongdoing, fault, or behavioural condemnation** must be avoided unless such judgement is **explicitly stated by the parent** in the original message.

#### ❌ Forbidden Moral Judgement Phrasing

**English (EN-GB)**:
- "This behaviour is unacceptable"
- "This should not have happened"
- "This was inappropriate"
- "This conduct is not acceptable"
- "This is not tolerated"
- "This was wrong"
- "Such behaviour cannot be condoned"

**German (DE-DE)**:
- "Dieses Verhalten ist inakzeptabel"
- "Das hätte nicht passieren dürfen"
- "Das war unangemessen"
- "Dieses Verhalten ist nicht akzeptabel"
- "Dies wird nicht toleriert"
- "Das war falsch"
- "Solches Verhalten kann nicht geduldet werden"

**Why This Is Forbidden**: These statements escalate conflict and imply institutional judgement before investigation. They can:
- Alienate parents who may have incomplete information
- Create adversarial positioning
- Pre-judge situations before facts are gathered
- Undermine collaborative problem-solving

#### ✅ Preferred Neutral Phrasing

**English (EN-GB)**:
- "I understand your concern about what occurred."
- "Thank you for raising your concerns about the situation."
- "I take what you've shared seriously and will follow this up."
- "I appreciate you bringing this to my attention."
- "I will look into what happened."

**German (DE-DE)**:
- "Ich verstehe Ihre Besorgnis über das Geschehene."
- "Vielen Dank, dass Sie Ihre Bedenken bezüglich der Situation ansprechen."
- "Ich nehme das, was Sie mitgeteilt haben, ernst und werde dem nachgehen."
- "Ich schätze es, dass Sie mich darauf aufmerksam machen."
- "Ich werde dem nachgehen, was passiert ist."

**Goal**: Calm acknowledgment, not moral evaluation.

#### Validation

```typescript
function detectMoralJudgement(draft: string, locale: DraftLocale): MoralJudgementValidation {
  const moralPhrases = locale === 'en-GB' ? [
    'unacceptable', 'should not have happened', 'was inappropriate',
    'is not acceptable', 'is not tolerated', 'was wrong', 
    'cannot be condoned', 'inexcusable'
  ] : [
    'inakzeptabel', 'hätte nicht passieren dürfen', 'war unangemessen',
    'nicht akzeptabel', 'wird nicht toleriert', 'war falsch',
    'kann nicht geduldet werden', 'unentschuldbar'
  ];
  
  const violations: string[] = [];
  const lowerDraft = draft.toLowerCase();
  
  moralPhrases.forEach(phrase => {
    if (lowerDraft.includes(phrase)) {
      violations.push(phrase);
    }
  });
  
  return {
    containsMoralJudgement: violations.length > 0,
    violations,
  };
}
```

**Validation Classification**: If moral judgement language is present without being directly quoted or clearly attributed to the parent:

**🟡 Repairable Failure** – `MORAL_JUDGEMENT_LANGUAGE`

**Regeneration instruction**:
```
"Remove moral judgement language: {violations}. Replace evaluative statements with neutral, professional phrasing that acknowledges concern without assigning blame or wrongdoing (e.g., 'I understand your concern about...' instead of 'This behaviour is unacceptable')."
```

---

### ✅ No New Facts Guarantee (Hallucination Prevention)

**Non-Negotiable Rule**: The system must **never introduce new facts, actions, conversations, outcomes, or institutional decisions** that are not explicitly present in `DraftContext`.

This rule applies across all generation modes:
- Safe Draft
- Panic Scan  
- Voice-to-Calm

#### ❌ Forbidden Fabrications

The draft must **not invent or imply**:

| Fabrication Type | Example (Forbidden) | Why Forbidden |
|------------------|---------------------|---------------|
| **Prior conversations** | "I spoke with Jacob earlier today" | Creates false timeline; implies actions not taken |
| **Completed investigations** | "We reviewed the incident" | Implies institutional process that may not exist |
| **Confirmed outcomes** | "It was determined that..." | Fabricates conclusions not yet reached |
| **Disciplinary actions** | "Appropriate consequences were applied" | Legal exposure; may contradict actual response |
| **Colleague involvement** | "I have informed the principal" | Fabricates institutional escalation |
| **Witness accounts** | "Other students confirmed..." | Creates false evidence; legal risk |
| **Factual certainty** | "This definitely happened because..." | Implies knowledge the teacher doesn't have |

**Absolute Rule**: Unless such information exists **explicitly in `DraftContext`**, it must **not appear** in the generated draft.

#### ✅ Allowed Language (Future-Intent Only)

When actions are **not yet taken**, the system must use **future-oriented intent language only**:

**Acceptable phrasing**:
- "I will speak with..."
- "My next step will be..."
- "I plan to follow up..."
- "I will review this and update you by..."
- "I intend to..."
- "I will investigate..."

#### ❌ Disallowed Language (Past-Tense Fabrication)

The following patterns are **forbidden** unless present in context:

**English (EN-GB)**:
- "I have already spoken with..."
- "We discussed this earlier..."
- "This has been investigated..."
- "We determined that..."
- "It was confirmed that..."
- "I spoke with [person] about this..."
- "We reviewed..."
- "The matter was addressed..."

**German (DE-DE)**:
- "Ich habe bereits mit... gesprochen"
- "Wir haben dies früher besprochen"
- "Dies wurde untersucht"
- "Wir haben festgestellt, dass..."
- "Es wurde bestätigt, dass..."
- "Ich sprach mit... darüber"
- "Wir haben überprüft..."
- "Die Angelegenheit wurde behandelt..."

#### Validation Rule (Phase 1)

**Detection Pattern**:
```typescript
function detectFabricatedFacts(draft: string, ctx: DraftContext): FabricationValidation {
  const issues: string[] = [];
  const lowerDraft = draft.toLowerCase();
  
  // Past-tense institutional action patterns
  const pastTensePatterns = [
    /I have (already )?spoken with/i,
    /we (have )?discussed/i,
    /(has|have) been investigated/i,
    /we determined/i,
    /it was confirmed/i,
    /I spoke with/i,
    /we reviewed/i,
    /was addressed/i,
    /appropriate (action|consequence)s (were|have been)/i,
    /(have|has) informed the/i,
    /other students confirmed/i,
  ];
  
  pastTensePatterns.forEach(pattern => {
    if (pattern.test(draft)) {
      // Check if this action exists in DraftContext
      const actionExists = checkContextForAction(pattern, ctx);
      if (!actionExists) {
        issues.push(`Fabricated past action: ${pattern}`);
      }
    }
  });
  
  return {
    containsFabrication: issues.length > 0,
    issues,
  };
}
```

**If the draft contains**:
- Past-tense institutional actions
- Implied conclusions  
- References to meetings or investigations

**AND those actions are not present in `DraftContext`**, this is a:

**🟡 Repairable Failure** – `FABRICATED_FACTS`

**Regeneration instruction**:
```
"Rewrite using future-intent language only. Do not claim actions or outcomes that have not yet occurred. Replace all past-tense statements with future commitments (e.g., 'I will speak with...' not 'I spoke with...')."
```

---

### ✅ Temporal Tense Constraint (Safety Rule)

All actions **not explicitly present in `DraftContext`** must be expressed as **future intent, never past completion**.

**Allowed patterns**:
- "I will..."
- "I plan to..."
- "My next step is..."
- "I intend to..."
- "I am going to..."

**Forbidden patterns**:
- "I have..."
- "We already..."
- "This was handled..."
- "I spoke with..."
- "We determined..."

**Rationale**: This rule exists to prevent implied factual claims and legal exposure. Past-tense language creates the impression that institutional actions have occurred, which may:
- Contradict actual events
- Create liability if actions were not taken
- Undermine teacher credibility if statements are false

**Violation classification**: 🟡 Repairable failure – `IMPLIED_PAST_ACTION`

**Validation**:
```typescript
function validateTemporalTense(draft: string, ctx: DraftContext): TenseValidation {
  const bodyOnly = draft.split(/Kind regards|Mit freundlichen Grüßen/i)[0];
  
  // Detect past-tense institutional actions not in context
  const forbiddenPastTense = [
    /I have (spoken|contacted|informed|discussed|investigated)/i,
    /we (have |already )(addressed|handled|reviewed|determined)/i,
    /this (has been|was) (investigated|reviewed|addressed|resolved)/i,
  ];
  
  const violations: string[] = [];
  forbiddenPastTense.forEach(pattern => {
    if (pattern.test(bodyOnly) && !actionExistsInContext(pattern, ctx)) {
      violations.push(pattern.source);
    }
  });
  
  return {
    meetsConstraint: violations.length === 0,
    violations,
  };
}
```

---

### ✅ No Absolute Language Rule

The system must **avoid absolute or totalising language** that implies certainty or guarantees.

#### ❌ Forbidden Absolute Modifiers

Unless **directly quoting** the parent message, these words are forbidden:

**English (EN-GB)**:
- always
- never  
- completely
- entirely
- fully resolved
- 100%
- permanently
- guaranteed
- certain
- definitely

**German (DE-DE)**:
- immer
- niemals
- vollständig
- ganz
- völlig gelöst
- garantiert
- sicher
- definitiv

**Rationale**: Absolute language creates implied guarantees and legal risk. Schools cannot guarantee behavior outcomes, and absolute commitments may become unfulfillable promises.

**Acceptable alternatives**:

| Forbidden | Acceptable Alternative |
|-----------|------------------------|
| "This will never happen again" | "I will work to prevent this from happening again" |
| "Your child is completely safe" | "Your child's safety is my priority" |
| "I guarantee this will be resolved" | "I am committed to resolving this" |
| "We have permanently addressed this" | "We have taken steps to address this" |

**Validation**:
```typescript
function detectAbsoluteLanguage(draft: string, locale: DraftLocale): AbsoluteLanguageValidation {
  const absoluteWords = locale === 'en-GB' 
    ? ['always', 'never', 'completely', 'entirely', 'fully resolved', '100%', 'permanently', 'guaranteed', 'certain', 'definitely']
    : ['immer', 'niemals', 'vollständig', 'ganz', 'völlig gelöst', 'garantiert', 'sicher', 'definitiv'];
  
  const violations: string[] = [];
  const lowerDraft = draft.toLowerCase();
  
  absoluteWords.forEach(word => {
    if (lowerDraft.includes(word.toLowerCase())) {
      violations.push(word);
    }
  });
  
  return {
    containsAbsolutes: violations.length > 0,
    violations,
  };
}
```

**Violation classification**: 🟡 Repairable failure – `ABSOLUTE_LANGUAGE`

**Regeneration instruction**:
```
"Remove absolute language: {violations}. Replace with qualified commitments (e.g., 'I will work to...' instead of 'This will never...')."
```

---

### ✅ Partial-Uncertainty Language (Explicitly Allowed)

To support safe, non-hallucinatory communication, the system is **explicitly permitted to use qualified uncertainty language** when information is incomplete.

**This language is encouraged and does not count as vagueness or avoidance.**

#### ✅ Allowed Phrasing

**English (EN-GB)**:
- "Based on what you've shared so far..."
- "From the information currently available..."
- "At this stage..."
- "With the details I have at the moment..."
- "Until I have a little more information..."
- "From what I understand so far..."
- "Based on the information provided..."

**German (DE-DE)**:
- "Auf Grundlage der bisher vorliegenden Informationen..."
- "Nach dem derzeitigen Kenntnisstand..."
- "Zum jetzigen Zeitpunkt..."
- "Mit den aktuell verfügbaren Informationen..."
- "Bis ich etwas mehr Informationen habe..."
- "Nach meinem bisherigen Verständnis..."
- "Basierend auf den bereitgestellten Informationen..."

#### Purpose

This allowance exists to:

1. **Prevent fabrication under uncertainty** – Acknowledges information gaps rather than filling them with invented details
2. **Avoid forced specificity** – Allows honest communication when context is limited
3. **Support clarification-first responses** – Enables seeking additional information without appearing evasive
4. **Reduce tension** between specificity rules and hallucination prevention – Provides acceptable middle ground

**Critical Principle**: Qualified uncertainty language is **preferred over invented detail**.

#### Examples in Context

**Appropriate use** (parent message lacks details):
> "Based on what you've shared so far, I understand you're concerned about [child name]'s experience. To ensure I respond appropriately, could you provide a bit more detail about what specifically concerns you?"

**Appropriate use** (unclear timeline):
> "From the information currently available, I will speak with [child name] tomorrow and follow up with you by the end of the week once I have a clearer picture."

**This phrasing maintains professionalism while being truthful about information limitations.**

**Phase 1 Validation Approach**: Use simple, reliable checks (string inclusion, keyword presence).

---

### ✅ Mandatory Emotional Structure

Every reply must follow this **six-step narrative sequence**:

1. **Acknowledge emotional concern** — Validate parent's feelings
2. **Acknowledge the incident** — Reference the specific issue raised
3. **Reassure safety and seriousness** — Affirm child safety and commitment
4. **Explain next steps** — Outline teacher's intended actions
5. **Invite continued dialogue** — Encourage follow-up communication
6. **Close with teacher sign-off** — Include teacher name and appropriate valediction

**Minimum Length Requirements**:

To ensure substantive, professional responses:

| Metric | Minimum | Target | Rationale |
|--------|---------|--------|-----------|
| **Word count** | 80 words | 120-180 words | Ensures each emotional step has room to develop |
| **Sentence count** | 6 sentences | 8-12 sentences | One sentence per structural element minimum |
| **Paragraph count** | 3 paragraphs | 4-5 paragraphs | Prevents wall-of-text; ensures readability |

**Validation**:
```typescript
function validateMinimumLength(draft: string): LengthValidation {
  // Remove sign-off for body analysis
  const bodyOnly = draft.split(/Kind regards|Mit freundlichen Grüßen/i)[0].trim();
  
  const wordCount = bodyOnly.split(/\s+/).length;
  const sentenceCount = bodyOnly.split(/[.!?]+/).filter(s => s.trim()).length;
  const paragraphCount = bodyOnly.split(/\n\n+/).filter(p => p.trim()).length;
  
  return {
    meetsMinimum: wordCount >= 80 && sentenceCount >= 6 && paragraphCount >= 3,
    wordCount,
    sentenceCount,
    paragraphCount,
    feedback: wordCount < 80 ? 'Draft too brief - expand emotional acknowledgment and next steps' : null,
  };
}
```

**Failure Handling**: If minimum length not met → 🟡 Repairable failure
- Regeneration instruction: _"Expand the draft to at least 80 words. Develop each emotional step with specific detail."_

**Why this matters**: 
- Prevents trivial responses like "Thanks for letting me know. I'll look into it."
- Ensures emotional acknowledgment has genuine substance
- Maintains professional teaching communication standards
- Signals to parents that the teacher has engaged thoughtfully

---

**Validation (Phase 1 - Heuristic Approach)**:

Use keyword presence and sentence count heuristics:

```typescript
function validateEmotionalStructure(draft: string, locale: DraftLocale): StructureValidation {
  const sections = {
    acknowledgeEmotion: false,
    acknowledgeIncident: false,
    reassureSafety: false,
    explainNextSteps: false,
    inviteDialogue: false,
    teacherSignoff: false,
  };
  
  const lowerDraft = draft.toLowerCase();
  
  // Step 1: Acknowledge emotion (keywords vary by locale)
  const emotionKeywords = locale === 'en-GB' 
    ? ['understand', 'sorry', 'concerned', 'appreciate', 'thank you for', 'hear']
    : ['verstehe', 'tut mir leid', 'besorgt', 'schätze', 'danke', 'höre'];
  sections.acknowledgeEmotion = emotionKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 2: Acknowledge incident (references specific situation)
  const incidentKeywords = locale === 'en-GB'
    ? ['situation', 'incident', 'matter', 'issue', 'what happened']
    : ['situation', 'vorfall', 'angelegenheit', 'problem', 'was passiert'];
  sections.acknowledgeIncident = incidentKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 3: Reassure safety
  const safetyKeywords = locale === 'en-GB'
    ? ['safe', 'seriously', 'priority', 'wellbeing', 'welfare']
    : ['sicher', 'ernst', 'priorität', 'wohlbefinden'];
  sections.reassureSafety = safetyKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 4: Explain next steps
  const actionKeywords = locale === 'en-GB'
    ? ['will', 'plan to', 'next steps', 'going to', 'action']
    : ['werde', 'plane', 'nächste schritte', 'maßnahmen'];
  sections.explainNextSteps = actionKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 5: Invite dialogue
  const dialogueKeywords = locale === 'en-GB'
    ? ['please', 'feel free', 'contact', 'reach out', 'discuss', 'talk']
    : ['bitte', 'gerne', 'kontakt', 'sprechen', 'diskutieren'];
  sections.inviteDialogue = dialogueKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 6: Teacher signoff (checked separately)
  sections.teacherSignoff = true; // Validated by dedicated signoff check
  
  return {
    allPresent: Object.values(sections).every(v => v),
    sections,
  };
}
```

**Minimum Requirement**: At least **4 out of 6** steps present (excluding sign-off, which is mandatory).

**Phase 3 Enhancement (Optional)**:
- Semantic similarity checks per section
- Sentence-level classification
- Tone analysis per emotional beat

**Critical**: Do not attempt perfect semantic classification in v1. Keyword heuristics are sufficient for trust-grade validation.

---

#### Recommended Paragraph Intent (Structure Guidance)

To support consistent readability and validation alignment, drafts should follow this paragraph structure:

| Paragraph | Purpose | Example Elements |
|-----------|---------|------------------|
| **1** | Emotional acknowledgment and issue reference | Greeting, validate parent's feelings, reference specific concern |
| **2** | Safety, seriousness, and reassurance | Affirm child safety, express that concern is taken seriously |
| **3** | Concrete next steps | Specific actions with timeline, investigation plan |
| **4** | Invitation to dialogue | Encourage follow-up, offer contact method |
| **5** | Professional sign-off | Valediction and teacher name |

**Note**: This is a recommended structure, not a rigid requirement. Some responses may combine paragraphs 3-4 or extend to 6 paragraphs for complex situations. The key is that all six emotional steps are present and clearly communicated.

---

### ✅ Teacher Accountability (Sign-off)

Every generated message must end with the teacher's full name.

**English (EN-GB)**:
```
Kind regards,
{Teacher Name}
```

**German (DE-DE)**:
```
Mit freundlichen Grüßen
{Teacher Name}
```

**Validation Rules**:
- `teacherName` must be non-empty and present in `DraftContext`
- Sign-off must be the final text block before draft end
- No placeholder values allowed (e.g., "Your teacher", "Teacher Name")

**Failure Mode**: If `teacherName` is unavailable:
- **Block draft generation**
- Display UI message: _"Please complete your profile with your full name to generate drafts."_
- Provide deep link to profile settings

---

### ✅ Encoding Safety (Zero Tolerance for Mojibake)

The system must **never emit** corrupted characters, including:

```
Ã¼  Ã¤  ÃŸ  â€™  â€œ  â€  Ã©  Ã   Ã¯
```

**Critical Pipeline Rule**:

> **Encoding repair must occur AFTER model output,  
> BEFORE persistence,  
> NEVER during prompt assembly or token processing.**

This prevents the sign-off regression incident where prompt-level fixes corrupted teacher names.

**Detection & Repair Pipeline**:

1. **Model outputs text** → No encoding intervention at this stage
2. **Post-output validation** → Scan for mojibake patterns
3. **Automatic repair** → Apply UTF-8 decoding fix if needed
4. **Pre-storage validation** → Verify repair succeeded
5. **Render-time check** → Final safety net before display

**Repair Logic**:
```typescript
function repairMojibake(text: string): { repaired: string; wasCorrupted: boolean } {
  const mojibakePattern = /Ã¼|Ã¤|ÃŸ|â€™|â€œ|â€|Ã©|Ã |Ã¯/;
  
  if (!mojibakePattern.test(text)) {
    return { repaired: text, wasCorrupted: false };
  }
  
  try {
    // Attempt UTF-8 repair
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    
    // Verify repair worked (no mojibake remains)
    if (!mojibakePattern.test(repaired)) {
      return { repaired, wasCorrupted: true };
    }
  } catch (error) {
    // Repair failed - this is a hard block
    throw new Error('ENCODING_FATAL: Unable to repair corrupted text');
  }
  
  // Repair didn't eliminate all mojibake
  throw new Error('ENCODING_FATAL: Persistent corruption after repair');
}
```

**Failure Escalation**: 
- If repair fails → **Hard block** (see Section 5)
- Never return text with visible corruption
- Log all repair attempts for monitoring

---

## 2. Unified DraftContext (Single Source of Truth)

All generation flows must be orchestrated via **one canonical `DraftContext` object**.

### Canonical Schema

```typescript
export type DraftLocale = "en-GB" | "de-DE";

export type DraftMode =
  | "parent_message"
  | "internal_note"
  | "general_email";

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type Urgency = "low" | "medium" | "high" | "unknown";

export type EmotionalIndicator =
  | "distress"
  | "fear"
  | "humiliation"
  | "anger"
  | "threat"
  | "grief"
  | "unknown";

export interface PanicScanData {
  scanId: string;
  cleanedMessage?: string;
  ocrConfidence?: number;
  summary?: string;
  suggestedReplyBullets?: string[];
}

export interface DraftContext {
  // === Core (Required) ===
  requestId: string;
  locale: DraftLocale;              // MUST come from UI locale
  mode: DraftMode;

  // === Entities (Optional but Recommended) ===
  parentName?: string;
  childName?: string;
  teacherName: string;              // REQUIRED — halt if missing
  schoolName?: string;

  // === Signals (Optional) ===
  riskLevel?: RiskLevel;
  urgency?: Urgency;
  emotionalIndicators?: EmotionalIndicator[];

  // === Integration Data ===
  panicScan?: PanicScanData;

  // === Safe Draft Inputs ===
  rawMessage?: string;
  subject?: string;                 // Optional; must not block persistence
  
  // === Metadata ===
  timestamp: string;                // ISO 8601 timestamp
  userAgent?: string;               // For diagnostics
}
```

### Context Rules

1. **Undefined removal**: All `undefined` values must be removed before persistence or prompt assembly
   - Use `stripUndefined()` recursively
   - Never send `undefined` fields to LLM
   
2. **Logging**: `DraftContext` must be logged (with PII redacted) for every generation request

3. **Immutability**: Once created, `DraftContext` should not be mutated; create new instances for regeneration

4. **Validation**: Schema validation must run before generation (use Zod, Yup, or similar)

### Context Assembly Priority

When assembling `DraftContext`, follow this priority:

1. **User profile data** (teacherName, schoolName)
2. **UI state** (locale, mode)
3. **Panic Scan data** (if applicable)
4. **Raw input** (rawMessage, subject)
5. **Derived signals** (riskLevel, urgency, emotionalIndicators)

---

### Risk Level Definitions

#### Risk Level: `unknown`

When `riskLevel` is `unknown` or not set:

- **Default to medium-tone response**
- **Do not escalate language** or assume urgency
- **Do not assume safeguarding concerns** or make high-stakes commitments
- **Maintain neutral professional phrasing**

**Rationale**: This prevents over-reaction when signal confidence is low. It's better to respond professionally without escalation than to inappropriately treat a routine concern as a crisis.

**Tone guidance for `unknown`**:
- Use measured, attentive language
- Express willingness to help without alarm
- Invite clarification if needed
- Example: "Thank you for reaching out. I'd like to understand more about your concern so I can respond appropriately..."

**Other Risk Levels**:

| Risk Level | Tone | Urgency Language | Example Response Element |
|------------|------|------------------|--------------------------|
| **low** | Warm, collaborative | "in the coming days", "next week" | "Let's work together on this..." |
| **medium** | Serious, professional | "this week", "by Friday" | "I take this seriously and will..." |
| **high** | Immediate, protective | "today", "immediately", "tomorrow morning" | "I'm addressing this immediately..." |

---

## 3. Exact Anchor Rules (Non-Negotiable)

### Child Name Usage

**Rule**: If `childName` exists in context → must be referenced **at least once** in the draft body.

**Examples**:
- ✅ "I'm sorry that Jacob experienced this situation."
- ✅ "Thank you for bringing this to my attention regarding Jacob."
- ❌ "I'm sorry your child experienced this situation." *(when `childName` is available)*

**Validation (Phase 1 - Minimum Viable)**:
```typescript
function validateChildName(draft: string, childName?: string): boolean {
  if (!childName) return true; // No child name provided, pass validation
  
  // Simple case-insensitive string inclusion
  const normalizedDraft = draft.toLowerCase().normalize('NFC');
  const normalizedName = childName.toLowerCase().normalize('NFC');
  
  return normalizedDraft.includes(normalizedName);
}
```

**Phase 3 Enhancement (Optional)**:
- Semantic similarity checks using embeddings
- Pronoun resolution (confirming "he/she" refers to the named child)
- Nickname/formal name matching

**Critical**: Do not implement semantic checks in v1. String inclusion is sufficient and reliable.

---

### Parent Greeting Hierarchy

Apply the **first available** option:

1. **Full name**: `parentName` exists → `"Dear Sarah,"`
2. **Title + surname**: Extracted from message → `"Dear Mr Thompson,"`
3. **Generic**: No name data → `"Dear parent,"` or `"Liebe/r Elternteil,"` (DE)

**Important**: The system must **not skip** to fallback if higher-confidence data exists.

**Edge Case**: If message contains multiple parent names (e.g., "Dear Mr and Mrs Johnson"), use the first name extracted or both if clear.

---

### Teacher Name (Absolute Requirement)

**Source of Truth**: `/account` endpoint → `Name` field

**Rules**:
- Required for **all drafts**
- No placeholder values permitted
- Must be full name (not username or email)

**If Missing**:
1. **Halt draft generation immediately**
2. Display modal: _"To generate drafts, please add your full name to your profile."_
3. Provide button: _"Complete Profile"_ → deep link to profile page
4. Log incomplete profile attempt

**Acceptable Examples**:
- ✅ "Sarah Mitchell"
- ✅ "Dr. James Chen"
- ✅ "Emma O'Sullivan"

**Unacceptable**:
- ❌ "Teacher"
- ❌ "Your child's teacher"
- ❌ "S. Mitchell" *(initials only)*

---

## 4. Input Scenarios & Flow Rules

### Scenario A: Paste-Text (Direct Input)

**Trigger**: Teacher pastes a parent message directly into the text editor.

**Critical Requirement**: 

> **Panic Scan must never be required to generate a reply.**  
> Safe Draft must always function independently.

This protects offline environments, low-permission contexts, and teachers who prefer text input.

**Flow**:
- Uses **Safe Draft only**
- Panic Scan is **not required**
- OCR is **not involved**

**DraftContext Population**:
```typescript
{
  requestId: generateId(),
  locale: getUserLocale(),
  mode: "parent_message",
  teacherName: getTeacherName(),
  rawMessage: pastedText,
  subject: extractSubjectIfPresent(pastedText),
  // Optional: NLP-extracted entities
  parentName: extractParentName(pastedText),
  childName: extractChildName(pastedText),
  emotionalIndicators: analyzeEmotion(pastedText),
}
```

**Validation**: This scenario must work fully without OCR or image processing.

**Dependency Rule**: Panic Scan is an enhancement layer, not a dependency. Safe Draft is the foundation.

---

### Scenario B: Panic Scan Screenshot Upload

**Trigger**: Teacher uploads screenshot of email/message app.

**Accepted Sources**:
- Email apps (Gmail, Outlook, Apple Mail, etc.)
- Parent portals (ClassDojo, Seesaw, etc.)
- Messaging systems (WhatsApp, SMS screenshots)

**Flow**:
1. Upload image → Panic Scan OCR analysis
2. Extract text, entities, emotional signals
3. Display "Continue to Draft" button
4. Populate `DraftContext` with OCR data
5. Generate draft using enriched context

**DraftContext Population**:
```typescript
{
  requestId: generateId(),
  locale: getUserLocale(),
  mode: "parent_message",
  teacherName: getTeacherName(),
  panicScan: {
    scanId: scanResult.id,
    cleanedMessage: scanResult.extractedText,
    ocrConfidence: scanResult.confidence,
    summary: scanResult.summary,
    suggestedReplyBullets: scanResult.bullets,
  },
  // OCR-extracted entities
  parentName: scanResult.entities.parentName,
  childName: scanResult.entities.childName,
  riskLevel: scanResult.analysis.riskLevel,
  urgency: scanResult.analysis.urgency,
  emotionalIndicators: scanResult.analysis.emotions,
}
```

**Key Requirement**: "Continue to Draft" must **preserve all Panic Scan data** without re-analysis.

**Panic Scan Success Criteria**:

Panic Scan is successful when:
- Extracted entities (parentName, childName) appear in the draft
- Emotional signals alter the tone appropriately
- Suggested bullets influence structure and phrasing
- `scanId` persists end-to-end and appears in logs

This ensures the OCR pipeline closes properly and data flows through.

---

### Scenario C: Camera Capture (Mobile/Tablet)

**Status**: **Implement v1 Scope**

**V1 Implementation**:
```html
<input 
  type="file" 
  accept="image/*" 
  capture="environment"
/>
```

**What's included in v1**:
- HTML `capture` attribute for native camera access
- No custom camera UI required
- Treated identically to screenshot upload (Scenario B)

**What's deferred to v2**:
- Custom camera overlay with guidance text
- Real-time OCR preview
- Capture retake within the app

**Trigger**: Teacher uses device camera to capture:
- Screens (laptop/desktop displays)
- Handwritten notes
- Printed emails or letters

**Platform Support**:
- ✅ iOS Safari (15+)
- ✅ Android Chrome (90+)
- ⚠️ Desktop browsers (shows file picker, no camera)

**Flow**: Identical to Scenario B (screenshot upload).

**UX Considerations** (v1):
- Show camera icon on mobile devices
- Provide guidance text: _"Point camera at message on screen or paper"_
- Allow retake if OCR confidence is low (via re-upload)

**Implementation Principle**: Keep scope realistic. The HTML `capture` attribute provides sufficient functionality for v1.

---

## 5. Deterministic Orchestration Rules

### Failure Classification: Hard Blocks vs Repairable Failures

Before implementing validation, understand the critical distinction:

#### 🔴 Hard Blocking Failures (Generation MUST Stop)

These conditions **halt generation immediately** with no retry:

| Condition | Error Code | User Message |
|-----------|------------|--------------|
| `teacherName` missing or empty | `MISSING_TEACHER_NAME` | "Please add your full name to your profile to generate drafts." |
| `DraftContext.locale` undefined | `INVALID_LOCALE` | "Unable to determine language settings. Please refresh and try again." |
| UTF-8 corruption that cannot be repaired | `ENCODING_FATAL` | "Text encoding error. Please contact support." |
| Schema validation failure | `INVALID_CONTEXT` | "Invalid request format. Please try again." |

**Why these are hard blocks**:
- Teacher accountability cannot be compromised
- Locale determines legal and linguistic safety
- Corrupted text is worse than no text
- Invalid schema indicates system error

#### 🟡 Repairable Failures (Retry Once)

These conditions trigger **controlled regeneration** (max 1 retry):

| Condition | Error Code | Regeneration Instruction |
|-----------|------------|-------------------------|
| Insufficient length | `INSUFFICIENT_LENGTH` | "Expand the draft to at least 80 words with 6+ sentences. Develop each emotional step with specific detail." |
| Generic/non-specific response | `LACKS_SPECIFICITY` | "Make the response specific to the parent's concern. Include: parent name '{parentName}' in greeting, child name '{childName}' in body, and reference specific details: {detail1}, {detail2}. Avoid generic phrases." |
| Fabricated facts or past actions | `FABRICATED_FACTS` | "Rewrite using future-intent language only. Do not claim actions or outcomes that have not yet occurred. Replace all past-tense institutional statements with future commitments (e.g., 'I will speak with...' not 'I spoke with...')." |
| Implied past action without context | `IMPLIED_PAST_ACTION` | "Remove past-tense claims not present in context. Use only future-intent language: 'I will...', 'I plan to...', 'My next step is...'." |
| Absolute language | `ABSOLUTE_LANGUAGE` | "Remove absolute language: {violations}. Replace with qualified commitments (e.g., 'I will work to...' instead of 'This will never...')." |
| Moral judgement language | `MORAL_JUDGEMENT_LANGUAGE` | "Remove moral judgement language: {violations}. Replace evaluative statements with neutral, professional phrasing that acknowledges concern without assigning blame or wrongdoing (e.g., 'I understand your concern about...' instead of 'This behaviour is unacceptable')." |
| Meta-instruction language | `META_INSTRUCTION_LANGUAGE` | "Remove directive/meta-instruction language. Write in first-person as the teacher speaking directly to the parent. Replace 'You should...' with 'I will...' patterns." |
| Professional boundary violation | `BOUNDARY_VIOLATION` | "Revise to maintain professional boundaries. Remove: {violationPhrase}. Avoid blame, promises beyond control, diagnostic language, or legal admissions." |
| Parent name missing from greeting | `MISSING_PARENT_GREETING` | "Use parent's name in greeting: 'Dear {parentName},' or 'Liebe/r {parentName},' (DE)." |
| Child name missing (when available) | `MISSING_CHILD_NAME` | "Include the child's name '{childName}' at least once in the draft body." |
| Incomplete emotional structure | `INCOMPLETE_STRUCTURE` | "Ensure all six steps are present: acknowledge emotion, acknowledge incident, reassure safety, explain next steps, invite dialogue, teacher sign-off." |
| Weak acknowledgment language | `WEAK_ACKNOWLEDGMENT` | "Strengthen emotional validation in the opening paragraph." |
| Missing urgency phrasing | `MISSING_URGENCY` | "Reflect the {urgency} level in response timing language." |
| Vague next steps | `VAGUE_NEXT_STEPS` | "Provide concrete action items with specific timeline (e.g., 'I will speak with {childName} tomorrow morning and contact you by Friday')." |
| Teacher sign-off format incorrect | `SIGNOFF_FORMAT_ERROR` | "End with 'Kind regards,\n{teacherName}' (EN) or 'Mit freundlichen Grüßen\n{teacherName}' (DE)." |

**Why these are repairable**:
- Model can correct with specific guidance
- Does not compromise safety or accountability
- UX remains smooth with one retry
- Prevents infinite rejection loops

**Implementation Rule**: If a repairable failure occurs twice (initial + retry), treat as success and log for analysis. Do not block user.

---

### Pre-Return Validation

Before returning any draft to the UI, run:

```typescript
validateDraftOutput(draft: string, ctx: DraftContext): ValidationResult
```

**Validation Checks**:

| Check | Rule | Error Type | Error Code |
|-------|------|------------|------------|
| **Locale match** | Draft language matches `ctx.locale` | 🔴 Hard Block | `LOCALE_MISMATCH` |
| **No fabricated facts** | No past-tense actions/conclusions not in context | 🟡 Repairable | `FABRICATED_FACTS` |
| **Temporal tense constraint** | Actions not in context use future-intent only | 🟡 Repairable | `IMPLIED_PAST_ACTION` |
| **No absolute language** | No absolutes (always/never/guaranteed) unless quoting | 🟡 Repairable | `ABSOLUTE_LANGUAGE` |
| **No moral judgement** | No evaluative language assigning wrongdoing/fault | 🟡 Repairable | `MORAL_JUDGEMENT_LANGUAGE` |
| **No meta-instruction** | Speaks as teacher, not about teacher | 🟡 Repairable | `META_INSTRUCTION_LANGUAGE` |
| **Minimum length** | Body text ≥80 words, ≥6 sentences, ≥3 paragraphs | 🟡 Repairable | `INSUFFICIENT_LENGTH` |
| **Specificity** | Contains ≥2 specific details from parent message; avoids generic-only phrases (or uses fallback rule) | 🟡 Repairable | `LACKS_SPECIFICITY` |
| **Parent name in greeting** | If `ctx.parentName` exists, appears in opening salutation | 🟡 Repairable | `MISSING_PARENT_GREETING` |
| **Child name in body** | If `ctx.childName` exists, appears in body text | 🟡 Repairable | `MISSING_CHILD_NAME` |
| **Teacher sign-off** | `ctx.teacherName` appears in closing | 🟡 Repairable | `MISSING_TEACHER_SIGNOFF` |
| **Professional boundaries** | No blame, promises, diagnoses, or legal admissions | 🟡 Repairable | `BOUNDARY_VIOLATION` |
| **Concrete next steps** | Includes specific actions with timeline/method | 🟡 Repairable | `VAGUE_NEXT_STEPS` |
| **Emotional structure** | All 6 narrative steps present | 🟡 Repairable | `INCOMPLETE_STRUCTURE` |
| **Encoding safety** | No mojibake characters | 🔴 Hard Block (if repair fails) | `ENCODING_ERROR` |
| **Tone appropriateness** | Matches `ctx.riskLevel` and `ctx.urgency` | 🟡 Repairable | `TONE_MISMATCH` |

### Repair Strategy

**On Validation Failure**:

1. **Log violation** with `requestId`, `errorCode`, and violation details
2. **Trigger controlled regeneration**:
   - Maximum 1 retry
   - Regeneration prompt must explicitly list violations
   - Example: _"Previous draft missing child name 'Jacob'. Include the child's name at least once."_
3. **If still failing**:
   - Surface clear UI message: _"Unable to generate draft. Please try rewording your input or contact support."_
   - **Do not return** a weak or evasive draft
   - Log to monitoring system for engineering review

**No Infinite Loops**: Hard cap at 2 generation attempts (initial + 1 retry).

---

---

## 6. Anti-Patterns (Explicitly Forbidden)

The following practices are **explicitly forbidden** and constitute violations of the trust-grade contract:

### 🚫 Prompt-Only Fixes Without Validation

**Forbidden**: Relying solely on prompt engineering to enforce requirements without post-generation validation.

**Why**: Prompts are probabilistic. Models can ignore instructions. Validation is mandatory.

**Example violation**: Adding "Always include the child's name" to the prompt without checking the output.

**Required**: Always validate critical requirements programmatically after generation.

---

### 🚫 Locale Detection Overriding UI Locale

**Forbidden**: Using language detection on the parent's message to determine output language.

**Why**: UI locale is the legal and UX contract. The teacher has chosen their interface language deliberately.

**Example violation**: Detecting German in a parent message and outputting German, despite English UI.

**Required**: `DraftContext.locale` is always sourced from UI settings, never from message content.

---

### 🚫 Optional Teacher Name Usage

**Forbidden**: Treating `teacherName` as optional or using placeholders like "Your teacher" or "The teacher".

**Why**: Teacher accountability is non-negotiable. Unsigned messages undermine trust and legal clarity.

**Example violation**: Generating a draft without halting when `teacherName` is missing.

**Required**: Hard block generation if `teacherName` is unavailable (see Section 5).

---

### 🚫 Model Discretion Over Emotional Acknowledgment

**Forbidden**: Allowing the model to decide whether emotional validation is necessary.

**Why**: Every parent message deserves emotional acknowledgment. This is a baseline empathy requirement.

**Example violation**: Generating a reply that jumps straight to "next steps" without validating parent concern.

**Required**: Emotional structure validation must flag missing acknowledgment (see Section 1).

---

### 🚫 Silent Fallback to Generic Language

**Forbidden**: Defaulting to generic phrases like "your child" when `childName` is available.

**Why**: Personalization is a trust signal. Using the child's name demonstrates attentiveness.

**Example violation**: Draft says "I will speak with your child" when `childName: "Emma"` exists in context.

**Required**: Validation must catch missing child name and trigger regeneration (see Section 5).

---

### 🚫 Silent Fallback to Generic Language

**Forbidden**: Defaulting to generic phrases like "your child" when `childName` is available, or "the matter" when specific details exist.

**Why**: Personalization is a trust signal. Using the child's name and specific details demonstrates attentiveness.

**Example violation**: 
- Draft says "I will speak with your child" when `childName: "Emma"` exists in context
- Draft says "regarding the matter you raised" when parent mentioned "the playground incident on Tuesday"

**Required**: 
- Use child's name when available
- Reference at least 2 specific details from parent's message
- Validation must catch missing specificity and trigger regeneration (see Section 5)

---

### 🚫 Vague or Non-Actionable Next Steps

**Forbidden**: Providing vague commitments without specific timelines or methods.

**Why**: Parents need concrete reassurance, not empty promises.

**Example violations**:
- "I will look into this" *(when? how?)*
- "I'll keep you updated" *(by when? via what method?)*
- "We'll address this soon" *(what does 'soon' mean?)*

**Required**: 
- Include specific timeline: "tomorrow morning", "by Friday", "this week"
- Include method when relevant: "I will speak with [childName]", "contact you via email"
- Example: "I will speak with Jacob tomorrow morning and contact you by Friday with an update."

---

### 🚫 Panic Scan as a Required Dependency

**Forbidden**: Making Panic Scan mandatory for Safe Draft functionality.

**Why**: Teachers may not always upload screenshots. Safe Draft must work independently.

**Example violation**: Disabling draft generation when `panicScan` is undefined.

**Required**: See Section 4, Scenario A — paste-text must work fully without OCR.

---

### 🚫 Encoding Repair During Prompt Assembly

**Forbidden**: Attempting to fix mojibake inside prompt construction or token processing.

**Why**: This corrupts prompts and has historically broken teacher name rendering.

**Example violation**: Repairing UTF-8 inside the system prompt template.

**Required**: Repair only happens post-output, pre-storage (see Section 1, Encoding Safety).

---

### 🚫 Teacher-Directive Language (Meta-Instruction Forbidden)

**Forbidden**: The system must **never instruct, correct, or critique the teacher**. The draft must always **speak as the teacher**, never **about the teacher**.

**Example violations**:

**English (EN-GB)**:
- "You should reassure parents that..."
- "Teachers must ensure..."
- "You need to explain..."
- "Make sure to follow up..."
- "Remember to contact..."
- "It's important that you..."

**German (DE-DE)**:
- "Sie sollten die Eltern beruhigen, dass..."
- "Lehrer müssen sicherstellen..."
- "Sie müssen erklären..."
- "Stellen Sie sicher, dass Sie..."
- "Denken Sie daran, Kontakt aufzunehmen..."

**Why this is forbidden**: 
- The draft is not instructions to the teacher—it IS the teacher's voice
- Meta-language breaks immersion and trust
- Parents would see directive language in the draft
- Undermines the teacher's authority and professionalism

**Required**: All language must be in the first-person voice of the teacher addressing the parent directly.

**Correct patterns**:
- ✅ "I will reassure [child name] that..."
- ✅ "I will ensure that..."
- ✅ "I will explain to [child name]..."
- ✅ "I will follow up with you..."

**Violation classification**: 🟡 Repairable failure – `META_INSTRUCTION_LANGUAGE`

**Validation**:
```typescript
function detectMetaInstruction(draft: string, locale: DraftLocale): MetaValidation {
  const metaPatterns = locale === 'en-GB' ? [
    /you should/i,
    /teachers must/i,
    /you need to/i,
    /make sure (to|you)/i,
    /remember to/i,
    /it's important that you/i,
    /be sure to/i,
  ] : [
    /sie sollten/i,
    /lehrer müssen/i,
    /sie müssen/i,
    /stellen sie sicher/i,
    /denken sie daran/i,
  ];
  
  const violations: string[] = [];
  metaPatterns.forEach(pattern => {
    if (pattern.test(draft)) {
      violations.push(pattern.source);
    }
  });
  
  return {
    containsMetaLanguage: violations.length > 0,
    violations,
  };
}
```

**Regeneration instruction**:
```
"Remove directive/meta-instruction language. Write in first-person as the teacher speaking directly to the parent. Replace 'You should...' with 'I will...' patterns."
```

---

## 7. Boutique Contract Tests (Regression Blockers)

These are **product contracts**, not unit tests. They prevent regressions that technically compile but emotionally fail.

### Minimum Required Tests (19 Contract Tests)

```typescript
describe("Trust-Grade Behaviour Contract", () => {
  
  test("minimum length requirement enforced", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const bodyOnly = draft.split(/Kind regards|Mit freundlichen Grüßen/i)[0].trim();
    const wordCount = bodyOnly.split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(80);
  });
  
  test("no fabricated past actions allowed", async () => {
    const ctx = createContext({ 
      rawMessage: "My child said something happened yesterday",
      // No past actions in context
    });
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    // Should not claim completed actions
    expect(lowerDraft).not.toMatch(/I have (already )?spoken with/i);
    expect(lowerDraft).not.toMatch(/we (have )?discussed/i);
    expect(lowerDraft).not.toMatch(/this (has been|was) investigated/i);
    
    // Should use future-intent language
    expect(lowerDraft).toMatch(/I will|I plan to|my next step/i);
  });
  
  test("temporal tense constraint enforced", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const bodyOnly = draft.split(/Kind regards|Mit freundlichen Grüßen/i)[0];
    
    // Should not have past-tense institutional actions
    const hasForbiddenPastTense = /I have (spoken|contacted|informed|discussed)|we (already|have) (addressed|handled|reviewed)/i.test(bodyOnly);
    expect(hasForbiddenPastTense).toBe(false);
  });
  
  test("no absolute language allowed", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    const absoluteWords = ['always', 'never', 'completely', 'entirely', 'guaranteed', 'permanently', '100%'];
    absoluteWords.forEach(word => {
      expect(lowerDraft).not.toContain(word);
    });
  });
  
  test("no moral judgement language allowed", async () => {
    const ctx = createContext({
      rawMessage: "My child was upset about something at school"
    });
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    const moralPhrases = [
      'unacceptable', 'should not have happened', 'was inappropriate',
      'is not acceptable', 'is not tolerated', 'was wrong'
    ];
    
    moralPhrases.forEach(phrase => {
      expect(lowerDraft).not.toContain(phrase);
    });
  });
  
  test("no meta-instruction language allowed", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    // Should not instruct the teacher
    expect(lowerDraft).not.toMatch(/you should|teachers must|you need to|make sure you|remember to/i);
    
    // Should speak as the teacher
    expect(lowerDraft).toMatch(/I will|I plan|my next step/i);
  });
  
  test("parent name must appear in greeting when available", async () => {
    const ctx = createContext({ parentName: "Sarah Thompson" });
    const draft = await generateDraft(ctx);
    expect(draft).toMatch(/Dear Sarah Thompson/i);
  });
  
  test("child name must appear in body when available", async () => {
    const ctx = createContext({ childName: "Emily" });
    const draft = await generateDraft(ctx);
    const bodyOnly = draft.split(/Kind regards|Mit freundlichen Grüßen/i)[0];
    expect(bodyOnly).toContain("Emily");
  });
  
  test("response must be specific, not generic", async () => {
    const ctx = createContext({ 
      rawMessage: "My child was upset about the playground incident on Tuesday during lunch break",
      childName: "Jacob"
    });
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    // Must contain specific references
    expect(lowerDraft).toMatch(/playground|tuesday|lunch/);
    
    // Should not rely solely on generic phrases
    const genericOnly = /the matter|the situation|your concern/i.test(draft) &&
                        !/playground|tuesday|lunch/i.test(draft);
    expect(genericOnly).toBe(false);
  });
  
  test("clarification-seeking response acceptable for vague input", async () => {
    const ctx = createContext({ 
      rawMessage: "I'm concerned about my child",
      childName: "Emma"
    });
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    // Either provides specific content OR seeks clarification (both acceptable)
    const hasSpecificContent = lowerDraft.length > 200;
    const seeksClarification = /could you (please )?clarify|more detail|help me understand/i.test(draft);
    
    expect(hasSpecificContent || seeksClarification).toBe(true);
  });
  
  test("must include concrete next steps with timeline", async () => {
    const ctx = createContext({ childName: "Emma" });
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    // Check for timeline indicators
    const hasTimeline = /tomorrow|today|this week|by friday|monday morning|next week/i.test(draft);
    expect(hasTimeline).toBe(true);
    
    // Check for action verbs
    const hasAction = /will speak|will contact|plan to|will investigate|will discuss/i.test(draft);
    expect(hasAction).toBe(true);
  });
  
  test("professional boundaries maintained - no blame language", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    const blamePatterns = [
      'it was our fault', 'we are to blame', 'your child is to blame',
      'you should have', 'why didn\'t you', 'if you had only'
    ];
    
    blamePatterns.forEach(pattern => {
      expect(lowerDraft).not.toContain(pattern);
    });
  });
  
  test("professional boundaries maintained - no absolute promises", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const lowerDraft = draft.toLowerCase();
    
    const problematicPromises = [
      'this will never happen again', 'i guarantee', 'i promise this won\'t'
    ];
    
    problematicPromises.forEach(promise => {
      expect(lowerDraft).not.toContain(promise);
    });
  });

  test("teacher sign-off must always appear", async () => {
    const ctx = createContext({ teacherName: "Sarah Mitchell" });
    const draft = await generateDraft(ctx);
    expect(draft).toMatch(/Kind regards,\s*Sarah Mitchell/);
  });

  test("locale lock enforced - German UI produces German draft", async () => {
    const ctx = createContext({ 
      locale: "de-DE",
      rawMessage: "My child was bullied today" // English input
    });
    const draft = await generateDraft(ctx);
    expect(detectLanguage(draft)).toBe("de-DE");
  });

  test("no mojibake allowed", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    expect(draft).not.toMatch(/Ã¼|Ã¤|ÃŸ|â€™|â€œ/);
  });

  test("panic scan continuity preserved", async () => {
    const scanData = { scanId: "scan_123", cleanedMessage: "Test" };
    const ctx = createContext({ panicScan: scanData });
    const draft = await generateDraft(ctx);
    // Verify scanId is logged and data is used
    expect(logs).toContainEqual(expect.objectContaining({ scanId: "scan_123" }));
  });

  test("paste-text scenario works without subject", async () => {
    const ctx = createContext({ 
      rawMessage: "I'm concerned about my child.",
      subject: undefined 
    });
    const draft = await generateDraft(ctx);
    expect(draft).toBeTruthy();
    expect(draft.length).toBeGreaterThan(100);
  });

  test("missing teacher name halts generation", async () => {
    const ctx = createContext({ teacherName: undefined });
    await expect(generateDraft(ctx)).rejects.toThrow("Teacher name required");
  });

  test("emotional structure completeness", async () => {
    const ctx = createContext({});
    const draft = await generateDraft(ctx);
    const structure = analyzeStructure(draft);
    expect(structure).toHaveProperty("acknowledgeEmotion", true);
    expect(structure).toHaveProperty("acknowledgeIncident", true);
    expect(structure).toHaveProperty("reassureSafety", true);
    expect(structure).toHaveProperty("explainNextSteps", true);
    expect(structure).toHaveProperty("inviteDialogue", true);
    expect(structure).toHaveProperty("teacherSignoff", true);
  });

});
```

### Test Execution Requirements

- **Pre-commit**: Run all contract tests before merging
- **CI/CD**: Block deployment if any contract test fails
- **Monitoring**: Alert engineering team if production logs show contract violations

---

## 8. Error Handling & Edge Cases

### Edge Case Matrix

| Scenario | Handling |
|----------|----------|
| Empty `rawMessage` | Prompt user: _"Please provide a message to respond to."_ |
| Low OCR confidence (<60%) | Show warning; allow manual text input |
| Multiple children mentioned | Use first child name; log ambiguity |
| Non-standard teacher name format | Accept any Unicode string; validate presence only |
| Subject line too long (>200 chars) | Truncate for logging; use full for generation |
| Unsupported locale requested | Fall back to EN-GB; log warning |
| Rate limit exceeded | Queue request; show estimated wait time |
| LLM timeout (>30s) | Retry once; then surface error |

### Monitoring & Observability

**Log Events**:
- Generation request initiated
- Validation failure
- Regeneration triggered
- Encoding repair applied
- Contract test violation in production

**Metrics to Track**:
- Generation success rate (target: >98%)
- Validation failure rate by error code
- Average generation latency (target: <5s)
- Regeneration rate (target: <2%)

---

## 9. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Implement `DraftContext` TypeScript interface
- [ ] Build `stripUndefined()` utility
- [ ] Create `validateDraftOutput()` function
- [ ] Set up logging pipeline (with PII redaction)

### Phase 2: Anchor & Structure Validation
- [ ] Child name detection logic
- [ ] Teacher sign-off validation
- [ ] Emotional structure analyzer
- [ ] Parent greeting hierarchy implementation

### Phase 3: Encoding Safety
- [ ] Mojibake detection RegEx
- [ ] UTF-8 repair function
- [ ] Pre-storage validation hook
- [ ] Frontend render-time check

### Phase 4: Scenario Support
- [ ] Paste-text flow (Scenario A)
- [ ] Screenshot upload flow (Scenario B)
- [ ] Camera capture UI component (Scenario C)
- [ ] Panic Scan integration

### Phase 5: Testing & Quality
- [ ] Write all 8 contract tests
- [ ] Set up CI/CD test gates
- [ ] Configure production monitoring
- [ ] Create engineering runbook for violations

### Phase 6: Localization
- [ ] German prompt templates
- [ ] German emotional structure validation
- [ ] German sign-off format
- [ ] Locale-switching integration tests

---

## 10. Final Principle: The Boutique Promise

**Zaza Draft is not a generic AI writer.**

It is a **teacher-safe, emotionally intelligent, legally cautious, trust-grade co-writer**.

Any behaviour that compromises:
- ✋ **Accountability** (teacher ownership)
- ✋ **Clarity** (unambiguous communication)
- ✋ **Empathy** (emotional validation)
- ✋ **Identity** (personal connection via names)
- ✋ **Linguistic safety** (encoding integrity)

...is considered a **defect**, even if all technical tests pass.

### Success Criteria

Zaza Draft succeeds when:
1. Teachers trust it with their most sensitive communications
2. Parents feel heard and respected in every response
3. Engineering never regresses on trust-grade behaviours
4. The product feels "boutique" — polished, reliable, and empathetic

---

### ✅ Teacher Override Principle

All generated drafts are **assistive suggestions, not authoritative outputs**.

Teachers may freely:
- **Edit** any part of the draft
- **Shorten** or expand content
- **Rephrase** in their own voice
- **Personalise** to their relationship with the parent
- **Partially reuse** only the sections they find helpful
- **Discard entirely** and start fresh

The system must **never imply** that:
- The draft is final
- The wording is required
- The response must be sent as written
- The teacher is expected to follow the output verbatim
- Edits indicate system failure

**The teacher remains the sole author and decision-maker.**

#### Purpose

This principle reinforces:

1. **Professional autonomy** – Teachers are empowered professionals, not template executors
2. **Pedagogical judgement** – Teachers know their students and families better than any system
3. **Trust in human oversight** – AI assists; humans decide
4. **Psychological safety** – Teachers can reject or modify outputs without guilt

#### Implementation Note

The UI should:
- Present drafts as editable by default
- Never lock or "finalize" generated text
- Avoid language like "approved draft" or "recommended response"
- Use framing like "Draft starting point" or "Suggested reply"

**This is a foundational product value, not a feature detail.**

---

## Status & Next Steps

**Status**: Design specification complete with hallucination-prevention guarantees and boutique-trust refinements. Ready for implementation.

**Next Steps**:
1. Review this spec with engineering, product, and design teams
2. Create staged PR plan with clear milestones
3. Assign owners for each implementation phase
4. Set up monitoring dashboards
5. Begin Phase 1 development

**Document Version**: 2.2 (Boutique-Trust Refinements)  
**Last Updated**: January 2026  
**Owner**: [Product/Engineering Lead]  
**Reviewers**: [List team members]

---

## Appendix: Glossary

**Mojibake**: Corrupted text resulting from incorrect character encoding (e.g., `Ã¼` instead of `ü`)

**Rhetorical Anchor**: A named entity or signal that must be referenced in generated text for authenticity and personalization

**Trust-Grade**: Meeting the quality threshold where teachers feel confident sharing the output with parents without significant editing

**Boutique**: Personalized, high-touch, and emotionally attuned (as opposed to mass-produced or generic)

**DraftContext**: The canonical data structure containing all information needed to generate a contextually appropriate response

**P0 Blocking Defect**: A bug that fundamentally breaks the trust contract and must be fixed before release

**Hallucination**: When the system fabricates facts, actions, or outcomes not present in the input context

**Future-Intent Language**: Phrasing that expresses planned actions without claiming they have already occurred (e.g., "I will speak with..." vs. "I spoke with...")

**Meta-Instruction Language**: Forbidden pattern where the draft instructs the teacher rather than speaking as the teacher

**Fabrication**: Any claim about past actions, completed investigations, or factual conclusions not explicitly present in `DraftContext`

