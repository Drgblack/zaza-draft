import { describe, expect, it } from "vitest"

import { classifyGenerationRequest } from "./classification"

describe("classifyGenerationRequest", () => {
  it("keeps safe draft typed notes as teacher internal notes", () => {
    const result = classifyGenerationRequest({
      draftMode: "parent_message",
      locale: "en",
      situation: "Need to send a calm update to Noah's family about homework and next steps.",
    })

    expect(result.metadata.mode).toBe("safe_draft")
    expect(result.metadata.direction).toBe("teacher_internal_notes")
    expect(result.metadata.source_type).toBe("typed_text")
  })

  it("defaults panic scan OCR to parent_to_teacher", () => {
    const result = classifyGenerationRequest({
      draftMode: "parent_message",
      locale: "en",
      situation: "My child came home upset and I need to understand what happened in class today.",
      requestedInputMode: "panic_scan",
      requestedSourceType: "ocr_text",
      messageType: "parent_complaint",
      hasScanId: true,
    })

    expect(result.metadata.mode).toBe("panic_scan")
    expect(result.metadata.direction).toBe("parent_to_teacher")
    expect(result.ocrUsed).toBe(true)
  })

  it("treats voice transcripts as teacher internal notes unless they strongly look like incoming parent text", () => {
    const result = classifyGenerationRequest({
      draftMode: "parent_message",
      locale: "en",
      situation: "I need to calm this down before I email the parent back about the homework concern.",
      requestedInputMode: "voice_to_calm",
      requestedSourceType: "voice_transcript",
      hasVoiceSessionId: true,
    })

    expect(result.metadata.mode).toBe("voice_to_calm")
    expect(result.metadata.direction).toBe("teacher_internal_notes")
    expect(result.transcriptUsed).toBe(true)
  })
})
