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
})
