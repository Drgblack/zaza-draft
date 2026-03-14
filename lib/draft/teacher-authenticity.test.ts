import { describe, expect, it } from "vitest"

import { TEACHER_AUTHENTICITY_BENCHMARKS } from "./teacher-authenticity.fixtures"
import { detectTeacherAuthenticityViolations } from "./teacher-authenticity"

describe("teacher authenticity benchmark set", () => {
  it("rejects generic AI-style benchmark outputs", () => {
    for (const benchmark of TEACHER_AUTHENTICITY_BENCHMARKS) {
      const violations = detectTeacherAuthenticityViolations(benchmark.shouldReject, {
        language: benchmark.language,
        mode: benchmark.mode,
        direction: benchmark.direction,
      })
      expect(violations.length, benchmark.id).toBeGreaterThan(0)
    }
  })

  it("accepts grounded teacher-authored benchmark outputs", () => {
    for (const benchmark of TEACHER_AUTHENTICITY_BENCHMARKS) {
      const violations = detectTeacherAuthenticityViolations(benchmark.shouldAccept, {
        language: benchmark.language,
        mode: benchmark.mode,
        direction: benchmark.direction,
      })
      expect(violations, benchmark.id).toEqual([])
    }
  })

  it("flags abstract or breezy next-step phrasing in parent-facing drafts", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I will gather the details, monitor the situation, and keep an eye on it before I come back to you.",
      {
        language: "en",
        mode: "parent_message",
        direction: "parent_to_teacher",
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining(["gather the details", "monitor the situation", "keep an eye on it"]),
    )
  })

  it("accepts concrete school actions in parent-facing drafts", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I will speak with the staff involved this afternoon, check what happened, and come back to you with an update tomorrow.",
      {
        language: "en",
        mode: "parent_message",
        direction: "parent_to_teacher",
      },
    )

    expect(violations).toEqual([])
  })

  it("rejects parent-reply complaint framing for safe draft teacher notes when the source does not support it", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I'm sorry to hear that your child came home so upset today. Thank you for bringing this to my attention.",
      {
        language: "en",
        mode: "parent_message",
        direction: "teacher_internal_notes",
        sourceText:
          "Need a calm update about lateness, missing homework, and the conversation I will have in class tomorrow morning.",
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining([
        "i'm sorry to hear that your child came home so upset",
        "thank you for bringing this to my attention",
      ]),
    )
  })

  it("covers the premium English report-comment benchmark set", () => {
    const englishReportCommentBenchmarks = TEACHER_AUTHENTICITY_BENCHMARKS.filter(
      (benchmark) => benchmark.language === "en" && benchmark.mode === "report_comment",
    )

    expect(englishReportCommentBenchmarks.length).toBeGreaterThanOrEqual(5)
  })

  it("rejects generic school-admin phrasing in English report comments", () => {
    const violations = detectTeacherAuthenticityViolations(
      "Luca continues to make progress and is a valued member of the class. He works well when supported.",
      {
        language: "en",
        mode: "report_comment",
        direction: "report_comment",
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining([
        "continues to make progress",
        "is a valued member of the class",
        "works well when supported",
      ]),
    )
  })

  it("accepts balanced premium-style English report comments", () => {
    const violations = detectTeacherAuthenticityViolations(
      "Jane reads with growing fluency and contributes thoughtful ideas during guided discussion. She still needs to slow down when recording her answers so that her written work matches the quality of her oral responses.",
      {
        language: "en",
        mode: "report_comment",
        direction: "report_comment",
      },
    )

    expect(violations).toEqual([])
  })
})
