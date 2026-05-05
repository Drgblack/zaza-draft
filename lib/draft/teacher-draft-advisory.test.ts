import { describe, expect, it } from "vitest"

import { buildTeacherDraftAdvisorySuggestions } from "@/lib/draft/teacher-draft-advisory"

describe("buildTeacherDraftAdvisorySuggestions", () => {
  it("generates a suggestion for a harsh teacher_draft sentence", () => {
    const draft = [
      "Dear Mrs Chen,",
      "",
      "I was appalled by Sally's tone when I asked her to start the task.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    expect(buildTeacherDraftAdvisorySuggestions(draft, "en")).toEqual([
      {
        id: "teacher-draft-suggestion-1",
        original: "I was appalled by Sally's tone when I asked her to start the task.",
        suggestion: "I was concerned by Sally's tone when I asked her to start the task.",
        type: "tone",
      },
    ])
  })

  it("does not generate suggestions for a neutral teacher_draft sentence", () => {
    const draft = [
      "Dear Mrs Chen,",
      "",
      "Sally forgot her reading record today, so I reminded her to bring it tomorrow.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    expect(buildTeacherDraftAdvisorySuggestions(draft, "en")).toEqual([])
  })

  it("includes original and suggestion text for strong directive language", () => {
    const draft = [
      "Dear Mrs Chen,",
      "",
      "You need to recognise that Sally must bring her planner every day.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    expect(buildTeacherDraftAdvisorySuggestions(draft, "en")).toEqual([
      {
        id: "teacher-draft-suggestion-1",
        original: "You need to recognise that Sally must bring her planner every day.",
        suggestion: "Please recognise that Sally must bring her planner every day.",
        type: "professional_judgement",
      },
    ])
  })
})
