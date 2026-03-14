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
    expect(prompt).toContain("Avoid lines such as 'my priority is to address it calmly and respectfully'")
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
    expect(prompt).toContain("Keep it observational, school-appropriate")
  })
})
