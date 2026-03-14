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
    expect(prompt).toContain("do not sound like customer support, HR, or counselling copy")
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
})
