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

  it("rejects panic scan replies that parrot a parent-reported incident back to the parent", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I understand he came home upset after being pushed by another student. I wanted to update you regarding the incident Jake experienced in class.",
      {
        language: "en",
        mode: "parent_message",
        direction: "parent_to_teacher",
        sourceText:
          "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime. Karen wants to know what happened and why nobody called.",
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining([
        "i understand he came home",
        "i wanted to update you regarding the incident",
      ]),
    )
  })

  it("rejects banned high-risk panic scan phrasing and generic closers", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I know this will feel serious. I wanted to follow up on what happened today. Please don't hesitate to reach out.",
      {
        language: "en",
        mode: "parent_message",
        direction: "parent_to_teacher",
        sourceText:
          "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime at school. Karen wants to know what happened in class and why nobody called.",
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining([
        "i know this will feel serious",
        "i wanted to follow up on what happened today",
        "please don't hesitate to reach out",
      ]),
    )
  })

  it("rejects product-mediated calm-update phrasing in parent-facing drafts", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I wanted to send a calm update about today's issue and explain the next step in school.",
      {
        language: "en",
        mode: "parent_message",
        direction: "teacher_internal_notes",
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining(["send a calm update", "calm update about"]),
    )
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

  it("flags safe draft teacher-note outputs that erase the student name and collapse multiple concerns", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I wanted to let you know that homework has been handed in late more regularly over the past few weeks.",
      {
        language: "en",
        mode: "parent_message",
        direction: "teacher_internal_notes",
        sourceText:
          "Sally has been late to registration, has called out during lessons, and has missing homework that still needs to be completed.",
        studentFirstName: "Sally",
        teacherNoteIssueClusters: [
          "attendance_lateness",
          "classroom_behaviour",
          "homework",
        ],
      },
    )

    expect(violations.map((violation) => violation.phrase)).toEqual(
      expect.arrayContaining(["missing student name", "collapsed concern cluster"]),
    )
  })

  it("allows one cluster to be brief in a three-cluster teacher-note message as long as at least two remain visible", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I wanted to make you aware that Sally has been late to school more regularly and that homework has also not been completed consistently. I will follow these points up in school this week.",
      {
        language: "en",
        mode: "parent_message",
        direction: "teacher_internal_notes",
        sourceText:
          "Sally is late to school every day, is disruptive when she arrives, and homework is still not being completed.",
        studentFirstName: "Sally",
        teacherNoteIssueClusters: [
          "attendance_lateness",
          "classroom_behaviour",
          "homework",
        ],
      },
    )

    expect(violations.map((violation) => violation.phrase)).not.toContain("collapsed concern cluster")
  })

  it("still rejects two-issue teacher-note outputs that drop one issue entirely", () => {
    const violations = detectTeacherAuthenticityViolations(
      "I wanted to let you know that homework has not been completed consistently this week.",
      {
        language: "en",
        mode: "parent_message",
        direction: "teacher_internal_notes",
        sourceText:
          "Sally has been late to class and still has missing homework that needs to be completed.",
        studentFirstName: "Sally",
        teacherNoteIssueClusters: [
          "attendance_lateness",
          "homework",
        ],
      },
    )

    expect(violations.map((violation) => violation.phrase)).toContain("collapsed concern cluster")
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
