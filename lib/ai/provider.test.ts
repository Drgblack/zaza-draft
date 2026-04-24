import { afterEach, describe, expect, it, vi } from "vitest"

import { buildSystemPrompt, generateDraft } from "./provider"

const ORIGINAL_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ORIGINAL_ANTHROPIC_MODEL_PRIMARY = process.env.ANTHROPIC_MODEL_PRIMARY

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = ORIGINAL_ANTHROPIC_API_KEY
  process.env.ANTHROPIC_MODEL_PRIMARY = ORIGINAL_ANTHROPIC_MODEL_PRIMARY
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("buildSystemPrompt", () => {
  it("forces safety rewrites to preserve the concrete concern instead of collapsing into generic wording", () => {
    const prompt = buildSystemPrompt({
      situation:
        "Your child refuses to listen and constantly disrupts the class. I've told you this before. If this continues we will have to involve the head teacher.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      safetyAnalysis: {
        riskScore: 82,
        riskLevel: "high",
        triggeredSignals: [
          {
            id: "acc_refusal_language",
            category: "accusation",
            label: "Refusal language",
            weight: 9,
            adjustedWeight: 9,
            patterns: ["refuses to"],
            matchMode: "any",
            proximityBoost: false,
            detectionNote: "Strong signal",
            matchedPhrase: "refuses to listen",
          },
          {
            id: "esc_consequence_framing",
            category: "escalation",
            label: "Consequence threat",
            weight: 8,
            adjustedWeight: 8,
            patterns: ["if this continues"],
            matchMode: "any",
            proximityBoost: true,
            detectionNote: "Conditional consequence",
            matchedPhrase: "If this continues",
          },
        ],
        toneClass: "accusatory",
        topicSensitivity: "medium",
        reactionForecast: {
          collaborative: 12,
          concerned: 18,
          defensive: 42,
          hostile: 18,
          confused: 10,
        },
        explanationLines: [],
        documentationModeAvailable: true,
        professionalRiskFlags: [],
        structuralImbalance: false,
      },
    })

    expect(prompt).toContain("The rewritten message MUST include the specific behaviour or concern from the original message.")
    expect(prompt).toContain("Never replace it with generic phrases such as 'a classroom concern'")
    expect(prompt).toContain("The rewritten message MUST make clear what happened, when or where it happened if that is stated in the source, and what the teacher would like to happen next.")
    expect(prompt).toContain("Only change framing and tone. Keep the factual content, pattern, and school context from the original message.")
    expect(prompt).toContain(
      "If the original says a student 'refuses to listen', rewrite it as the same concern in observation-based language",
    )
    expect(prompt).toContain("A parent reading the rewritten message should understand the exact concern without needing to ask a follow-up question.")
  })

  it("tells professional-risk rewrites to keep a specific safe category of concern", () => {
    const prompt = buildSystemPrompt({
      situation:
        "I think he might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      safetyAnalysis: {
        riskScore: 48,
        riskLevel: "medium",
        triggeredSignals: [],
        toneClass: "clinical",
        topicSensitivity: "high",
        reactionForecast: {
          collaborative: 20,
          concerned: 20,
          defensive: 40,
          hostile: 0,
          confused: 20,
        },
        explanationLines: [],
        documentationModeAvailable: false,
        professionalRiskFlags: [
          {
            signalId: "pro_medical_speculation",
            label: "Medical or diagnostic speculation",
            matchedPhrase: "ADHD",
          },
        ],
        structuralImbalance: false,
      },
    })

    expect(prompt).toContain("instead of 'ADHD' use 'some learning and attention challenges'")
    expect(prompt).toContain("instead of 'deliberately disrupts' use 'some persistent behavioural patterns during lessons'")
    expect(prompt).toContain("instead of 'emotional problems' use 'some social and emotional difficulties'")
    expect(prompt).toContain("Never reduce the concern to vague placeholders such as 'a classroom concern' or 'some issues' on their own.")
  })

  it("adds professional-risk substitutions to the documentation mode prompt", () => {
    const prompt = buildSystemPrompt({
      situation:
        "I think he might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
      documentationSourceText:
        "I think he might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      documentationMode: true,
      documentationTopic: "learning support",
    })

    expect(prompt).toContain("Begin with the heading: Incident Record")
    expect(prompt).toContain("Location: <specific location from the source, or \"Not specified\" if none is given>")
    expect(prompt).toContain("Observed behaviour: <observable, factual description only>")
    expect(prompt).toContain("Teacher response: <what the teacher did, said, recorded, or checked>")
    expect(prompt).toContain("Follow-up action: <next step already stated in the source, or \"No follow-up action recorded.\">")
    expect(prompt).toContain('Replace "I think he might have ADHD" with "The student may benefit from assessment for learning and attention needs."')
    expect(prompt).toContain('Replace motive language such as "deliberately disrupts" with the observable action only.')
    expect(prompt).toContain("Replace psychological interpretation with safe pastoral wording")
    expect(prompt).toContain("Convert subjective or emotional wording into neutral, defensible documentation language.")
    expect(prompt).toContain("Only document what is explicitly stated in the source text. Do not infer, elaborate, or add specific details not present in the input.")
    expect(prompt).toContain("If the source is vague, the record must also be vague. Write only what can be directly attributed to the source.")
  })

  it("hard-bans institutional child references in parent messages while keeping documentation mode exempt", () => {
    const parentPrompt = buildSystemPrompt({
      situation: "Please rewrite this parent email about work completed during class.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      studentFirstName: "Luca",
    })

    expect(parentPrompt).toContain("never refer to the child as 'the student'")
    expect(parentPrompt).toContain("Reference order for parent-facing teacher messages: use the student's first name if it is available; otherwise use 'your child'")
    expect(parentPrompt).toContain("Avoid institutional phrases such as 'learning tasks' or 'instruction time'.")

    const documentationPrompt = buildSystemPrompt({
      situation: "Document the incident clearly.",
      documentationSourceText: "Document the incident clearly.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      documentationMode: true,
    })

    expect(documentationPrompt).toContain('Use third person: "The student" or [child name] if known.')
  })

  it("logs the full assembled prompt for professional-risk requests", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key"
    process.env.ANTHROPIC_MODEL_PRIMARY = "test-model"

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          content: [{ type: "text", text: "Draft text" }],
          model: "test-model",
          usage: { input_tokens: 20, output_tokens: 22 },
        }),
    })
    vi.stubGlobal(
      "fetch",
      fetchSpy,
    )

    const result = await generateDraft({
      situation:
        "I think he might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      safetyAnalysis: {
        riskScore: 48,
        riskLevel: "medium",
        triggeredSignals: [],
        toneClass: "clinical",
        topicSensitivity: "high",
        reactionForecast: {
          collaborative: 20,
          concerned: 20,
          defensive: 40,
          hostile: 0,
          confused: 20,
        },
        explanationLines: [],
        documentationModeAvailable: false,
        professionalRiskFlags: [
          {
            signalId: "pro_medical_speculation",
            label: "Medical or diagnostic speculation",
            matchedPhrase: "ADHD",
          },
        ],
        structuralImbalance: false,
      },
    })

    expect(result.text).toBe("Draft text")
    expect(result.providerMeta.modelUsed).toBe("test-model")
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-key",
          "anthropic-version": "2023-06-01",
        }),
      }),
    )

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[provider] professional-risk full prompt",
      expect.objectContaining({
        documentationMode: false,
        generationMode: "safe_draft",
        direction: "teacher_to_parent",
        prompt: expect.stringContaining("some learning and attention challenges"),
      }),
    )
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[provider] professional-risk full prompt",
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Never reduce the concern to vague placeholders such as 'a classroom concern' or 'some issues' on their own.",
        ),
      }),
    )
  })

  it("avoids mojibake characters in the prompt contract", () => {
    const prompt = buildSystemPrompt({
      situation: "Die Eltern beschreiben die Hausaufgabenlast und bitten um einen Plan.",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "de",
        prompt_builder: "panic_scan",
      },
      tone: "professional",
      language: "de",
      mode: "parent_message",
      pronounPreference: "auto",
    })
    expect(prompt).not.toMatch(/[Ã�]/)
  })

  it("keeps safe draft internal notes out of parent-reply framing", () => {
    const prompt = buildSystemPrompt({
      situation: "Need to send a calm update to Noah's family about homework and next steps.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("Transform rough teacher notes into a polished teacher-authored parent message.")
    expect(prompt).toContain("Do not open with phrases such as 'thank you for sharing your concerns'")
    expect(prompt).toContain("Sound like a calm, experienced teacher writing a real message")
    expect(prompt).toContain("Open with the actual issue, update, or boundary from the source text")
    expect(prompt).toContain("Turn the notes into concrete teacher actions")
    expect(prompt).toContain("Include a concise professional subject line on the first line")
  })

  it("adds a teacher-authentic wording guard against consultant-style support boilerplate", () => {
    const prompt = buildSystemPrompt({
      situation: "Need a calm parent update about classroom behaviour and next steps.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("Avoid abstract support-plan phrasing such as 'support his success in the classroom'")
    expect(prompt).toContain("'specific strategies to help him stay more engaged during our activities'")
    expect(prompt).toContain("Prefer plain teacher wording such as 'see what might help'")
    expect(prompt).toContain("working together and helping the child feel settled and make steady progress in class")
  })

  it("makes warm and direct tone contracts visibly distinct in the prompt", () => {
    const warmPrompt = buildSystemPrompt({
      situation: "Need a parent message about repeated lateness and lesson disruption.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "warm",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      studentFirstName: "Sally",
    })
    const directPrompt = buildSystemPrompt({
      situation: "Need a parent message about repeated lateness and lesson disruption.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "direct",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      studentFirstName: "Sally",
    })

    expect(warmPrompt).toContain("Warm drafts should usually include one brief partnership sentence near the end")
    expect(directPrompt).toContain("Direct drafts should usually be one short sentence or one brief paragraph leaner than warm drafts on the same topic")
  })

  it("adds forward-safe rewrite instructions when that rewrite mode is enabled", () => {
    const prompt = buildSystemPrompt({
      situation: "Please rewrite this so it sounds calmer and clearer.",
      previousDraft:
        "Your child keeps refusing instructions and this is becoming unacceptable.",
      rewrite: true,
      forwardSafeRewrite: true,
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_to_parent",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("Forward-Safe Rewrite mode is enabled.")
    expect(prompt).toContain(
      "Rewrite so the message remains professional and defensible even if it is forwarded beyond the original recipient.",
    )
    expect(prompt).toContain("Prioritize neutral tone, collaborative framing, non-accusatory wording")
    expect(prompt).toContain("Preserve the underlying facts, documentation accuracy, safeguarding clarity")
  })

  it("tells safe draft teacher notes to preserve names and multi-issue clusters", () => {
    const prompt = buildSystemPrompt({
      situation:
        "Sally has been late three times this week, has called out repeatedly during lessons, and still has missing homework. I need to send this home without sounding harsh.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      studentFirstName: "Sally",
      teacherNoteIssueClusters: [
        "attendance_lateness",
        "classroom_behaviour",
        "homework",
      ],
    })

    expect(prompt).toContain("Preserve the student name when one is present unless privacy mode is explicitly active.")
    expect(prompt).toContain("Preserve every major concern cluster that is clearly present in the notes.")
    expect(prompt).toContain("attendance/lateness")
    expect(prompt).toContain("classroom behaviour")
    expect(prompt).toContain("homework")
    expect(prompt).toContain("Do not collapse multiple concern clusters into a single generic homework message.")
    expect(prompt).toContain("use a short framing sentence that signals several linked concerns")
    expect(prompt).toContain("Address each of these in the final message")
    expect(prompt).toContain("No privacy mode is active for this request, so keep the student's first name when it is provided.")
  })

  it("uses the panic scan reply builder for incoming OCR parent messages", () => {
    const prompt = buildSystemPrompt({
      situation: "My child came home upset about the homework load.",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("This request comes from Panic Scan OCR.")
    expect(prompt).toContain("write a calm, professional teacher reply to the parent")
    expect(prompt).toContain("do not sound like customer support, HR, counselling copy")
    expect(prompt).toContain("Open like a real teacher replying to an upset parent")
    expect(prompt).toContain("the teacher reply must acknowledge receipt, not restate facts")
    expect(prompt).toContain("Do not repeat information the parent provided back to them")
    expect(prompt).toContain("Open with a brief acknowledgement only")
    expect(prompt).toContain("Avoid lines such as 'my priority is to address it calmly and respectfully'")
    expect(prompt).toContain("Do not use product-mediated tone narration such as 'send a calm update'")
    expect(prompt).toContain("Make the subject neutral, teacher-authentic, and specific to the issue or update.")
  })

  it("tells typed parent-email replies not to replay the complaint back line by line", () => {
    const prompt = buildSystemPrompt({
      situation:
        "Subject: Concern about how Lucy was treated in class\n\nHello,\n\nLucy came home upset and felt embarrassed after being asked to put her phone away.\n\nKind regards,\nLucy's Dad",
      generationMetadata: {
        mode: "safe_draft",
        direction: "parent_to_teacher",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("For typed or pasted parent emails, acknowledge the concern briefly")
    expect(prompt).toContain("Do not restate the parent's complaint in detail")
    expect(prompt).toContain("do not replay their wording back to them sentence by sentence")
    expect(prompt).toContain("move straight to the teacher's explanation, boundary, or next step")
    expect(prompt).toContain("Do not repeat unusual parent wording such as 'mindfulness purposes'")
    expect(prompt).toContain("Do not invent lines about missing records")
    expect(prompt).toContain("Use only one brief, neutral acknowledgement of the child's experience.")
    expect(prompt).toContain("Avoid administrative rebuttal phrasing such as 'on file', 'formal arrangement'")
    expect(prompt).toContain("Avoid school-admin wording such as 'properly documented', 'logged', 'recorded', 'evidenced', or 'pastoral process'")
    expect(prompt).toContain("Do not invent extra classroom details such as what other pupils were doing")
    expect(prompt).toContain("Do not promise 'flexibility' or echo the parent's requested accommodation language.")
    expect(prompt).toContain("suggest clarifying that through the school's usual support process")
    expect(prompt).toContain("A strong reply pattern for this kind of parent email is")
    expect(prompt).toContain("the intention was not to make the child feel uncomfortable")
    expect(prompt).toContain("Do not use the absence of prior information as a rebuttal.")
  })

  it("adds Lucy-specific guardrails against brittle admin claims and defensive phrasing", () => {
    const prompt = buildSystemPrompt({
      situation: [
        "Subject: Concern about how Lucy was treated in class",
        "",
        "Hello,",
        "",
        "Lucy came home quite upset today and told me she was asked to put her phone away during your lesson.",
        "",
        "We have previously explained that Lucy uses her phone for mindfulness purposes when she feels overwhelmed, and we would expect some flexibility around this rather than her being singled out in front of others.",
        "",
        "She felt embarrassed and said the way it was handled made her uncomfortable.",
        "",
        "Kind regards,",
        "Lucy's Dad",
      ].join("\n"),
      generationMetadata: {
        mode: "safe_draft",
        direction: "parent_to_teacher",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      studentFirstName: "Lucy",
    })

    expect(prompt).toContain("This Safe Draft request is a typed or pasted parent email to the teacher.")
    expect(prompt).toContain("Do not repeat distinctive parent-coined phrases, coping-tool labels, or advocacy wording verbatim.")
    expect(prompt).toContain("Do not invent administrative claims, record-keeping disclaimers")
    expect(prompt).toContain("Do not rebut the parent by referring to records, files, plans, prior notice, prior awareness, formal arrangements")
    expect(prompt).toContain("keep the usual expectation clear, then suggest clarifying any support arrangement through the appropriate school process or colleague")
    expect(prompt).toContain("acknowledge that the child may need support when feeling overwhelmed without disputing whether this was previously communicated")
    expect(prompt).toContain("Do not sound defensive, bureaucratic, or self-justifying.")
  })

  it("adds safety-sensitive opening guidance for panic scan safeguarding concerns", () => {
    const prompt = buildSystemPrompt({
      situation: "My daughter says she was pushed at break and felt unsafe for the rest of the day.",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("Risk tier for this Panic Scan reply: HIGH_RISK.")
    expect(prompt).toContain("HIGH RISK Panic Scan framework")
    expect(prompt).toContain("Do not minimise it or suggest it was probably a misunderstanding.")
  })

  it("applies the full high-risk panic scan framework for bullying or safety complaints", () => {
    const prompt = buildSystemPrompt({
      situation:
        "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime at school. Karen wants to know what happened in class and why nobody called.",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      tone: "empathetic",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("HIGH RISK Panic Scan framework")
    expect(prompt).toContain("Open with genuine emotional acknowledgement")
    expect(prompt).toContain("If you did not witness the incident, say so honestly without dismissing the report")
    expect(prompt).toContain("Name concrete investigation steps")
    expect(prompt).toContain("Offer a real conversation such as a phone call or in-person meeting")
    expect(prompt).toContain("'I know this will feel serious'")
    expect(prompt).toContain("'I wanted to follow up on what happened today'")
    expect(prompt).toContain("Do not use generic closers such as 'Please don't hesitate to reach out'")
  })

  it("adds cautious guidance for low-confidence panic scan OCR", () => {
    const prompt = buildSystemPrompt({
      situation: "my child upset homework load call me",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      ocrConfidence: 0.32,
    })

    expect(prompt).toContain("Default assumption: the uploaded screenshot is a message received by the teacher")
    expect(prompt).toContain("OCR confidence is limited. Preserve meaning conservatively")
  })

  it("keeps voice-to-calm focused on concrete teacher actions", () => {
    const prompt = buildSystemPrompt({
      situation: "I need to calm down these spoken notes about missed homework and tomorrow morning's reset.",
      generationMetadata: {
        mode: "voice_to_calm",
        direction: "teacher_internal_notes",
        source_type: "voice_transcript",
        locale: "en",
        prompt_builder: "voice_to_calm",
      },
      tone: "empathetic",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("one concrete next step in school")
    expect(prompt).toContain("Avoid managerial process wording such as 'gather the details'")
  })

  it("adds a targeted rewrite contract when the previous draft sounded generic", () => {
    const prompt = buildSystemPrompt({
      situation: "Parent is upset about behaviour notes from this week.",
      generationMetadata: {
        mode: "panic_scan",
        direction: "parent_to_teacher",
        source_type: "ocr_text",
        locale: "en",
        prompt_builder: "panic_scan",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      teacherAuthenticityViolations: {
        types: ["generic_empathy", "customer_support"],
        phrases: ["thank you for sharing your concerns", "please feel free to reach out"],
      },
    })

    expect(prompt).toContain("Your previous draft sounded generic or AI-written.")
    expect(prompt).toContain("Do not use these phrases: thank you for sharing your concerns, please feel free to reach out.")
  })

  it("keeps continuation recovery isolated for safe draft teacher notes", () => {
    const prompt = buildSystemPrompt({
      situation: "Need a calm parent update about lateness, disruption, and missing homework.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
      forceContinuation: true,
      teacherAuthenticityViolations: {
        types: ["customer_support"],
        phrases: ["thank you for bringing this to my attention"],
      },
    })

    expect(prompt).toContain("This greeting needs a full teacher-authored message.")
    expect(prompt).toContain("do not imply that the parent raised a complaint unless the source explicitly says so")
    expect(prompt).toContain("Keep the recovery strictly in teacher-note-to-parent framing.")
  })

  it("keeps report comment prompts structurally separate from parent emails", () => {
    const prompt = buildSystemPrompt({
      situation: "Short report comment on steady reading progress and more independent written work.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "report_comment",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "report_comment",
      pronounPreference: "auto",
    })

    expect(prompt).toContain("no subject line, no greeting, no sign-off")
    expect(prompt).toContain("pasted directly into a report or comment bank")
    expect(prompt).toContain("Keep it observational, balanced, school-appropriate")
    expect(prompt).toContain("prefer the student's name or neutral noun phrases over uncertain singular they/them wording")
    expect(prompt).toContain("lead with a clear strength or recent progress")
    expect(prompt).toContain("Avoid generic school-admin phrases such as 'continues to make progress'")
    expect(prompt).toContain("Vary sentence openings so the comment does not sound formulaic or repetitive.")
  })

  it("defines visible tone contracts for English parent-facing drafts", () => {
    const warmPrompt = buildSystemPrompt({
      situation:
        "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "warm",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })
    const professionalPrompt = buildSystemPrompt({
      situation:
        "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "professional",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })
    const directPrompt = buildSystemPrompt({
      situation:
        "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "direct",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })
    const empatheticPrompt = buildSystemPrompt({
      situation:
        "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
      generationMetadata: {
        mode: "safe_draft",
        direction: "teacher_internal_notes",
        source_type: "typed_text",
        locale: "en",
        prompt_builder: "safe_draft",
      },
      tone: "empathetic",
      language: "en",
      mode: "parent_message",
      pronounPreference: "auto",
    })

    expect(warmPrompt).toContain("Warm tone contract: sound gently relational and collaborative")
    expect(warmPrompt).toContain("I just wanted to let you know about...")
    expect(professionalPrompt).toContain("Professional tone contract: sound calm, measured, and factual")
    expect(professionalPrompt).toContain("I wanted to update you on...")
    expect(directPrompt).toContain("Direct tone contract: be concise, explicit, and clear")
    expect(directPrompt).toContain("I am writing to let you know that...")
    expect(empatheticPrompt).toContain(
      "Empathetic tone contract: acknowledge the child's difficulty or the parent's worry more explicitly than warm",
    )
    expect(empatheticPrompt).toContain("I wanted to reach out about...")
  })
})
