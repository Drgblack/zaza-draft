import { describe, expect, it } from "vitest"

import {
  detectTeacherNoteIssueClusters,
  summarizeTeacherNoteIssueClusters,
} from "./teacher-note-issues"

describe("teacher note issue extraction", () => {
  it("detects multiple issue clusters in rough teacher notes", () => {
    const clusters = detectTeacherNoteIssueClusters(
      "Sally has been late to registration, is calling out during lessons, and still has missing homework.",
      "en",
    )

    expect(clusters).toEqual([
      "attendance_lateness",
      "classroom_behaviour",
      "homework",
    ])
  })

  it("summarizes issue clusters in prompt-friendly language", () => {
    expect(
      summarizeTeacherNoteIssueClusters(
        ["attendance_lateness", "classroom_behaviour", "homework"],
        "en",
      ),
    ).toBe("attendance/lateness, classroom behaviour, homework")
  })

  it("detects attendance, behaviour, and homework in the exact Sally harsh-notes case", () => {
    const clusters = detectTeacherNoteIssueClusters(
      "Hello Parent, did you know that Sally is late to school every single day and she is very disruptive when she finally arrives. She is silly in class and annoys me to death! And, the homework is just awful. She needs to get a grip and you should tell her that too! If I don't see her improve she will get sent to the Principal's office.",
      "en",
    )

    expect(clusters).toEqual([
      "attendance_lateness",
      "classroom_behaviour",
      "homework",
    ])
  })

  it("keeps a single-issue homework note focused on homework only", () => {
    const clusters = detectTeacherNoteIssueClusters(
      "Homework has not been handed in this week and I need to send a clear parent update.",
      "en",
    )

    expect(clusters).toEqual(["homework"])
  })

  it("detects both issue clusters in a two-issue note", () => {
    const clusters = detectTeacherNoteIssueClusters(
      "Sally has been late to class and still has missing homework that needs to be completed.",
      "en",
    )

    expect(clusters).toEqual(["attendance_lateness", "homework"])
  })
})
