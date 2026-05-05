import { describe, expect, it } from "vitest"

import {
  applyTeacherDraftSentenceLevelSafetyOverrides,
  assessTeacherDraftStructuralPreservation,
} from "@/lib/draft/teacher-draft-structure"

describe("assessTeacherDraftStructuralPreservation", () => {
  it("flags paragraph and sentence collapse in teacher drafts", () => {
    const sourceText = [
      "Dear Mrs Chen,",
      "",
      "Sally arrived upset and needed a few minutes to settle.",
      "",
      "She called out during reading and found it difficult to follow the instructions.",
      "",
      "At lunchtime she left her pencil case, exercise book, and favourite jumper in the corridor.",
      "",
      "I collected those items and reminded her to return promptly for the afternoon lesson.",
      "",
      "Please speak with Sally this evening so she arrives ready to learn tomorrow.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    const candidateText = [
      "Dear Mrs Chen,",
      "",
      "Sally had a difficult day and needed several reminders.",
      "",
      "I collected her belongings and would appreciate your support before tomorrow.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    const assessment = assessTeacherDraftStructuralPreservation({
      sourceText,
      candidateText,
      language: "en",
      greetingLine: "Dear Mrs Chen,",
    })

    expect(assessment.shouldPreserveSource).toBe(true)
    expect(assessment.violations.map((violation) => violation.type)).toContain("PARAGRAPH_COUNT_DRIFT")
    expect(assessment.violations.map((violation) => violation.type)).toContain("SENTENCE_COUNT_DRIFT")
    expect(assessment.violations.map((violation) => violation.type)).toContain("MISSING_DETAIL_ANCHOR")
  })

  it("flags outputs that drift outside the +/-30 percent word band", () => {
    const sourceText = [
      "Dear Mrs Smith,",
      "",
      "Tom forgot his homework today.",
      "Please remind him to bring it tomorrow.",
      "",
      "Thanks,",
      "Greg",
    ].join("\n")

    const candidateText = [
      "Dear Mrs Smith,",
      "",
      "I wanted to let you know that Tom forgot his homework today, and I completely understand that mornings can feel rushed for families.",
      "I will remind him again in class tomorrow, check whether he has everything he needs, and make sure we take a calm and supportive approach to the follow-up.",
      "",
      "Thanks,",
      "Greg",
    ].join("\n")

    const assessment = assessTeacherDraftStructuralPreservation({
      sourceText,
      candidateText,
      language: "en",
      greetingLine: "Dear Mrs Smith,",
    })

    expect(assessment.shouldPreserveSource).toBe(true)
    expect(assessment.violations.map((violation) => violation.type)).toContain("WORD_COUNT_DRIFT")
  })

  it("preserves narrow safety edits when structure and details remain intact", () => {
    const sourceText = [
      "Dear Mrs Smith,",
      "",
      "I was appalled by Tom's tone when I asked him to start the task.",
      "He then put the reading book under the table instead of opening it.",
      "Please remind him to bring his exercise book and reading folder tomorrow.",
      "",
      "Best regards,",
      "Greg",
    ].join("\n")

    const candidateText = [
      "Dear Mrs Smith,",
      "",
      "I was concerned by Tom's tone when I asked him to start the task.",
      "He then put the reading book under the table instead of opening it.",
      "Please remind him to bring his exercise book and reading folder tomorrow.",
      "",
      "Best regards,",
      "Greg",
    ].join("\n")

    const assessment = assessTeacherDraftStructuralPreservation({
      sourceText,
      candidateText,
      language: "en",
      greetingLine: "Dear Mrs Smith,",
    })

    expect(assessment.shouldPreserveSource).toBe(false)
    expect(assessment.violations).toEqual([])
  })

  it("applies narrow sentence-level safety overrides without changing structure", () => {
    const sourceText = [
      "Dear Parent/Carer,",
      "",
      "I am tired of repeating this and I can't keep chasing homework every week.",
      "",
      "Your child needs to take this seriously because this is getting frustrating.",
      "",
      "Regards,",
      "Greg",
    ].join("\n")

    const updated = applyTeacherDraftSentenceLevelSafetyOverrides(sourceText, "en")

    expect(updated).toContain("I need to keep the expectations around homework clear and consistent each week.")
    expect(updated).toContain("Please speak with your child about this so the expectation remains clear.")
    expect(updated.split(/\n\s*\n/)).toHaveLength(sourceText.split(/\n\s*\n/).length)
  })

  it("preserves sentence-start capitalisation when safety overrides replace a full sentence", () => {
    const sourceText = [
      "Dear Parent/Carer,",
      "",
      "These expectations will remain in place.",
      "",
      "Regards,",
      "Greg",
    ].join("\n")

    const updated = applyTeacherDraftSentenceLevelSafetyOverrides(sourceText, "en")

    expect(updated).toContain("These expectations need to remain clear.")
    expect(updated).not.toContain("these expectations need to remain clear.")
  })
})
