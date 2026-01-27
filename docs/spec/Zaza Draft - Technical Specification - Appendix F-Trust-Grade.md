# Appendix F â€” Trust-Grade Draft Orchestration & Quality Contract

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

### âœ… Language & Locale (Non-Negotiable)

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

### âœ… Required Rhetorical Anchors

If the following data exists in context, it **must** be used in the generated draft:

| Field | Requirement | Validation Rule (Phase 1) |
|-------|-------------|---------------------------|
| `childName` | Must appear at least once | Case-insensitive string inclusion |
| `teacherName` | Must appear in final sign-off | Exact match in closing block |
| `parentName` | Used in greeting when available | Present if data exists |
| `riskLevel` | Must influence tone and structure | Keyword audit (see Section 5) |
| `urgency` | Must affect acknowledgment timing language | Keyword audit (see Section 5) |

**Phase 1 Validation Approach**: Use simple, reliable checks (string inclusion, keyword presence).

**Phase 3 Enhancements** (Optional): Semantic similarity, embeddings, advanced NLP.

**Defect Classification**: Failure to include required anchors when data exists is a **ðŸŸ¡ Repairable failure** (see Section 5).

**Edge Cases**:
- If `childName` is missing â†’ generation may proceed, but validation must not fail
- If `teacherName` is missing â†’ **halt generation** and prompt profile completion
- If `parentName` is missing â†’ use fallback greeting hierarchy (see Â§3)

---

### âœ… Mandatory Emotional Structure

Every reply must follow this **six-step narrative sequence**:

1. **Acknowledge emotional concern** â€” Validate parent's feelings
2. **Acknowledge the incident** â€” Reference the specific issue raised
3. **Reassure safety and seriousness** â€” Affirm child safety and commitment
4. **Explain next steps** â€” Outline teacher's intended actions
5. **Invite continued dialogue** â€” Encourage follow-up communication
6. **Close with teacher sign-off** â€” Include teacher name and appropriate valediction

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
    : ['verstehe', 'tut mir leid', 'besorgt', 'schÃ¤tze', 'danke', 'hÃ¶re'];
  sections.acknowledgeEmotion = emotionKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 2: Acknowledge incident (references specific situation)
  const incidentKeywords = locale === 'en-GB'
    ? ['situation', 'incident', 'matter', 'issue', 'what happened']
    : ['situation', 'vorfall', 'angelegenheit', 'problem', 'was passiert'];
  sections.acknowledgeIncident = incidentKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 3: Reassure safety
  const safetyKeywords = locale === 'en-GB'
    ? ['safe', 'seriously', 'priority', 'wellbeing', 'welfare']
    : ['sicher', 'ernst', 'prioritÃ¤t', 'wohlbefinden'];
  sections.reassureSafety = safetyKeywords.some(kw => lowerDraft.includes(kw));
  
  // Step 4: Explain next steps
  const actionKeywords = locale === 'en-GB'
    ? ['will', 'plan to', 'next steps', 'going to', 'action']
    : ['werde', 'plane', 'nÃ¤chste schritte', 'maÃŸnahmen'];
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

### âœ… Teacher Accountability (Sign-off)

Every generated message must end with the teacher's full name.

**English (EN-GB)**:
```
Kind regards,
{Teacher Name}
```

**German (DE-DE)**:
```
Mit freundlichen GrÃ¼ÃŸen
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

### âœ… Encoding Safety (Zero Tolerance for Mojibake)

The system must **never emit** corrupted characters, including:

```
ÃƒÂ¼  ÃƒÂ¤  ÃƒÅ¸  Ã¢â‚¬â„¢  Ã¢â‚¬Å“  Ã¢â‚¬  ÃƒÂ©  Ãƒ   ÃƒÂ¯
```

**Critical Pipeline Rule**:

> **Encoding repair must occur AFTER model output,  
> BEFORE persistence,  
> NEVER during prompt assembly or token processing.**

This prevents the sign-off regression incident where prompt-level fixes corrupted teacher names.

**Detection & Repair Pipeline**:

1. **Model outputs text** â†’ No encoding intervention at this stage
2. **Post-output validation** â†’ Scan for mojibake patterns
3. **Automatic repair** â†’ Apply UTF-8 decoding fix if needed
4. **Pre-storage validation** â†’ Verify repair succeeded
5. **Render-time check** â†’ Final safety net before display

**Repair Logic**:
```typescript
function repairMojibake(text: string): { repaired: string; wasCorrupted: boolean } {
  const mojibakePattern = /ÃƒÂ¼|ÃƒÂ¤|ÃƒÅ¸|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬|ÃƒÂ©|Ãƒ |ÃƒÂ¯/;
  
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
- If repair fails â†’ **Hard block** (see Section 5)
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
  teacherName: string;              // REQUIRED â€” halt if missing
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

## 3. Exact Anchor Rules (Non-Negotiable)

### Child Name Usage

**Rule**: If `childName` exists in context â†’ must be referenced **at least once** in the draft body.

**Examples**:
- âœ… "I'm sorry that Jacob experienced this situation."
- âœ… "Thank you for bringing this to my attention regarding Jacob."
- âŒ "I'm sorry your child experienced this situation." *(when `childName` is available)*

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

1. **Full name**: `parentName` exists â†’ `"Dear Sarah,"`
2. **Title + surname**: Extracted from message â†’ `"Dear Mr Thompson,"`
3. **Generic**: No name data â†’ `"Dear parent,"` or `"Liebe/r Elternteil,"` (DE)

**Important**: The system must **not skip** to fallback if higher-confidence data exists.

**Edge Case**: If message contains multiple parent names (e.g., "Dear Mr and Mrs Johnson"), use the first name extracted or both if clear.

---

### Teacher Name (Absolute Requirement)

**Source of Truth**: `/account` endpoint â†’ `Name` field

**Rules**:
- Required for **all drafts**
- No placeholder values permitted
- Must be full name (not username or email)

**If Missing**:
1. **Halt draft generation immediately**
2. Display modal: _"To generate drafts, please add your full name to your profile."_
3. Provide button: _"Complete Profile"_ â†’ deep link to profile page
4. Log incomplete profile attempt

**Acceptable Examples**:
- âœ… "Sarah Mitchell"
- âœ… "Dr. James Chen"
- âœ… "Emma O'Sullivan"

**Unacceptable**:
- âŒ "Teacher"
- âŒ "Your child's teacher"
- âŒ "S. Mitchell" *(initials only)*

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
1. Upload image â†’ Panic Scan OCR analysis
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
- âœ… iOS Safari (15+)
- âœ… Android Chrome (90+)
- âš ï¸ Desktop browsers (shows file picker, no camera)

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

#### ðŸ”´ Hard Blocking Failures (Generation MUST Stop)

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

#### ðŸŸ¡ Repairable Failures (Retry Once)

These conditions trigger **controlled regeneration** (max 1 retry):

| Condition | Error Code | Regeneration Instruction |
|-----------|------------|-------------------------|
| Child name missing (when available) | `MISSING_CHILD_NAME` | "Include the child's name '{childName}' at least once in the draft." |
| Incomplete emotional structure | `INCOMPLETE_STRUCTURE` | "Ensure all six steps are present: acknowledge emotion, acknowledge incident, reassure safety, explain next steps, invite dialogue, teacher sign-off." |
| Weak acknowledgment language | `WEAK_ACKNOWLEDGMENT` | "Strengthen emotional validation in the opening paragraph." |
| Missing urgency phrasing | `MISSING_URGENCY` | "Reflect the {urgency} level in response timing language." |
| Teacher sign-off format incorrect | `SIGNOFF_FORMAT_ERROR` | "End with 'Kind regards,\n{teacherName}' (EN) or 'Mit freundlichen GrÃ¼ÃŸen\n{teacherName}' (DE)." |

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
| **Locale match** | Draft language matches `ctx.locale` | ðŸ”´ Hard Block | `LOCALE_MISMATCH` |
| **Teacher sign-off** | `ctx.teacherName` appears in closing | ðŸŸ¡ Repairable | `MISSING_TEACHER_SIGNOFF` |
| **Child name presence** | If `ctx.childName` exists, appears in draft | ðŸŸ¡ Repairable | `MISSING_CHILD_NAME` |
| **Emotional structure** | All 6 narrative steps present | ðŸŸ¡ Repairable | `INCOMPLETE_STRUCTURE` |
| **Encoding safety** | No mojibake characters | ðŸ”´ Hard Block (if repair fails) | `ENCODING_ERROR` |
| **Tone appropriateness** | Matches `ctx.riskLevel` and `ctx.urgency` | ðŸŸ¡ Repairable | `TONE_MISMATCH` |

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

### ðŸš« Prompt-Only Fixes Without Validation

**Forbidden**: Relying solely on prompt engineering to enforce requirements without post-generation validation.

**Why**: Prompts are probabilistic. Models can ignore instructions. Validation is mandatory.

**Example violation**: Adding "Always include the child's name" to the prompt without checking the output.

**Required**: Always validate critical requirements programmatically after generation.

---

### ðŸš« Locale Detection Overriding UI Locale

**Forbidden**: Using language detection on the parent's message to determine output language.

**Why**: UI locale is the legal and UX contract. The teacher has chosen their interface language deliberately.

**Example violation**: Detecting German in a parent message and outputting German, despite English UI.

**Required**: `DraftContext.locale` is always sourced from UI settings, never from message content.

---

### ðŸš« Optional Teacher Name Usage

**Forbidden**: Treating `teacherName` as optional or using placeholders like "Your teacher" or "The teacher".

**Why**: Teacher accountability is non-negotiable. Unsigned messages undermine trust and legal clarity.

**Example violation**: Generating a draft without halting when `teacherName` is missing.

**Required**: Hard block generation if `teacherName` is unavailable (see Section 5).

---

### ðŸš« Model Discretion Over Emotional Acknowledgment

**Forbidden**: Allowing the model to decide whether emotional validation is necessary.

**Why**: Every parent message deserves emotional acknowledgment. This is a baseline empathy requirement.

**Example violation**: Generating a reply that jumps straight to "next steps" without validating parent concern.

**Required**: Emotional structure validation must flag missing acknowledgment (see Section 1).

---

### ðŸš« Silent Fallback to Generic Language

**Forbidden**: Defaulting to generic phrases like "your child" when `childName` is available.

**Why**: Personalization is a trust signal. Using the child's name demonstrates attentiveness.

**Example violation**: Draft says "I will speak with your child" when `childName: "Emma"` exists in context.

**Required**: Validation must catch missing child name and trigger regeneration (see Section 5).

---

### ðŸš« Panic Scan as a Required Dependency

**Forbidden**: Making Panic Scan mandatory for Safe Draft functionality.

**Why**: Teachers may not always upload screenshots. Safe Draft must work independently.

**Example violation**: Disabling draft generation when `panicScan` is undefined.

**Required**: See Section 4, Scenario A â€” paste-text must work fully without OCR.

---

### ðŸš« Encoding Repair During Prompt Assembly

**Forbidden**: Attempting to fix mojibake inside prompt construction or token processing.

**Why**: This corrupts prompts and has historically broken teacher name rendering.

**Example violation**: Repairing UTF-8 inside the system prompt template.

**Required**: Repair only happens post-output, pre-storage (see Section 1, Encoding Safety).

---

## 7. Boutique Contract Tests (Regression Blockers)

These are **product contracts**, not unit tests. They prevent regressions that technically compile but emotionally fail.

### Minimum Required Tests

```typescript
describe("Trust-Grade Behaviour Contract", () => {
  
  test("child name must appear if present", async () => {
    const ctx = createContext({ childName: "Emily" });
    const draft = await generateDraft(ctx);
    expect(draft).toContain("Emily");
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
    expect(draft).not.toMatch(/ÃƒÂ¼|ÃƒÂ¤|ÃƒÅ¸|Ã¢â‚¬â„¢|Ã¢â‚¬Å“/);
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
- âœ‹ **Accountability** (teacher ownership)
- âœ‹ **Clarity** (unambiguous communication)
- âœ‹ **Empathy** (emotional validation)
- âœ‹ **Identity** (personal connection via names)
- âœ‹ **Linguistic safety** (encoding integrity)

...is considered a **defect**, even if all technical tests pass.

### Success Criteria

Zaza Draft succeeds when:
1. Teachers trust it with their most sensitive communications
2. Parents feel heard and respected in every response
3. Engineering never regresses on trust-grade behaviours
4. The product feels "boutique" â€” polished, reliable, and empathetic

---

## Status & Next Steps

**Status**: Design specification complete. Ready for implementation.

**Next Steps**:
1. Review this spec with engineering, product, and design teams
2. Create staged PR plan with clear milestones
3. Assign owners for each implementation phase
4. Set up monitoring dashboards
5. Begin Phase 1 development

**Document Version**: 2.0  
**Last Updated**: January 2026  
**Owner**: [Product/Engineering Lead]  
**Reviewers**: [List team members]

---

## Appendix: Glossary

**Mojibake**: Corrupted text resulting from incorrect character encoding (e.g., `ÃƒÂ¼` instead of `Ã¼`)

**Rhetorical Anchor**: A named entity or signal that must be referenced in generated text for authenticity and personalization

**Trust-Grade**: Meeting the quality threshold where teachers feel confident sharing the output with parents without significant editing

**Boutique**: Personalized, high-touch, and emotionally attuned (as opposed to mass-produced or generic)

**DraftContext**: The canonical data structure containing all information needed to generate a contextually appropriate response

**P0 Blocking Defect**: A bug that fundamentally breaks the trust contract and must be fixed before release


