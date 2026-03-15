import { describe, expect, it } from "vitest"

import { buildSystemPrompt } from "./provider"

describe("buildSystemPrompt", () => {
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

    expect(prompt).toContain("If the message raises a bullying, safety, or safeguarding concern")
    expect(prompt).toContain("Do not minimise it or suggest it was probably a misunderstanding.")
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
