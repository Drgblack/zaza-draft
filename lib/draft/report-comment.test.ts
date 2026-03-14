import { describe, expect, it } from "vitest"

import { sanitizeReportCommentStructure, sanitizeReportCommentText } from "./report-comment"

describe("report comment sanitizer", () => {
  it("removes subject, greeting, and sign-off residue from report comments", () => {
    const sanitized = sanitizeReportCommentText(
      [
        "Subject: Update on Sam",
        "",
        "Dear family,",
        "",
        "Sam contributes more consistently in discussion and completes follow-up tasks with less prompting.",
        "",
        "Kind regards,",
        "Dr Greg Blackburn",
      ].join("\n"),
    )

    expect(sanitized).toBe(
      "Sam contributes more consistently in discussion and completes follow-up tasks with less prompting.",
    )
  })

  it("keeps observational report-comment body text intact", () => {
    const sanitized = sanitizeReportCommentText(
      "Nora contributes thoughtfully during class discussion and now works with greater independence in extended tasks.",
    )

    expect(sanitized).toBe(
      "Nora contributes thoughtfully during class discussion and now works with greater independence in extended tasks.",
    )
  })

  it("sanitizes draft structures for report-comment rendering", () => {
    const structure = sanitizeReportCommentStructure(
      {
        subject: "Update on Sam",
        paragraphs: [
          "Hello Jordan,",
          "Sam contributes more steadily in paired reading and explains his thinking more clearly.",
          "Kind regards,",
          "Dr Greg Blackburn",
        ],
      },
      "en",
    )

    expect(structure.subject).toBeUndefined()
    expect(structure.paragraphs).toEqual([
      "Sam contributes more steadily in paired reading and explains his thinking more clearly.",
    ])
  })
})
