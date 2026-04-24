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

  it("routes pasted parent emails with a sign-off to parent_to_teacher in safe draft mode", () => {
    const result = classifyGenerationRequest({
      draftMode: "parent_message",
      locale: "en",
      situation: [
        "Subject: Concern about how Lucy was treated in class",
        "Hello,",
        "",
        "Lucy came home quite upset today and told me she was asked to put her phone away during your lesson.",
        "",
        "We would expect some flexibility around this rather than her being singled out in front of others.",
        "",
        "Kind regards,",
        "Lucy's Dad",
      ].join("\n"),
    })

    expect(result.metadata.mode).toBe("safe_draft")
    expect(result.metadata.direction).toBe("parent_to_teacher")
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

  it.each([
    {
      name: "angry parent screenshot in English",
      locale: "en" as const,
      situation:
        "I am very upset that my child was left in tears after class today and I want a clear explanation.",
      messageType: "parent_complaint",
      sourceConfidence: 0.93,
    },
    {
      name: "worried parent screenshot in English",
      locale: "en" as const,
      situation:
        "My child has been anxious about maths all week and I am worried the homework is now too much.",
      messageType: "student_concern",
      sourceConfidence: 0.88,
    },
    {
      name: "demanding parent screenshot in English",
      locale: "en" as const,
      situation:
        "I expect this to be sorted today and I want to know why my daughter was spoken to that way.",
      messageType: "urgent_request",
      sourceConfidence: 0.86,
    },
    {
      name: "defensive parent screenshot in German",
      locale: "de" as const,
      situation:
        "Mein Sohn hat das nicht absichtlich gemacht und ich möchte wissen, warum er dafür allein verantwortlich gemacht wurde.",
      messageType: "parent_complaint",
      sourceConfidence: 0.9,
    },
    {
      name: "low-confidence OCR still defaults to parent to teacher",
      locale: "en" as const,
      situation:
        "Dear Ms Smith,\nI wanted to update you on your child in class today.\nKind regards,\nJordan",
      messageType: "general_inquiry",
      sourceConfidence: 0.28,
    },
  ])("defaults panic scan direction to parent_to_teacher for $name", (testCase) => {
    const result = classifyGenerationRequest({
      draftMode: "parent_message",
      locale: testCase.locale,
      situation: testCase.situation,
      requestedInputMode: "panic_scan",
      requestedSourceType: "ocr_text",
      messageType: testCase.messageType,
      sourceConfidence: testCase.sourceConfidence,
      hasScanId: true,
    })

    expect(result.metadata.mode).toBe("panic_scan")
    expect(result.metadata.direction).toBe("parent_to_teacher")
  })

  it("only overrides panic scan to teacher_to_parent with strong outgoing-teacher evidence", () => {
    const result = classifyGenerationRequest({
      draftMode: "parent_message",
      locale: "en",
      situation: [
        "Subject: Update on Maya's reading",
        "Dear parents,",
        "I wanted to update you on your child after today's reading lesson.",
        "In class, Maya completed the task with more confidence and I will keep the same support in place tomorrow.",
        "Kind regards,",
        "Ms Patel",
      ].join("\n"),
      requestedInputMode: "panic_scan",
      requestedSourceType: "ocr_text",
      messageType: "general_inquiry",
      sourceConfidence: 0.94,
      hasScanId: true,
    })

    expect(result.metadata.direction).toBe("teacher_to_parent")
  })
})
