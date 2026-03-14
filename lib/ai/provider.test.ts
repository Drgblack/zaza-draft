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
  })
})
