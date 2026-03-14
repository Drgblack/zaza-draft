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
})
