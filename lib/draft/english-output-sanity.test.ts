import { describe, expect, it } from "vitest"

import { applyEnglishOutputSanity } from "./english-output-sanity"

describe("applyEnglishOutputSanity", () => {
  it("repairs object pronouns leaked into possessive positions in English report comments", () => {
    const result = applyEnglishOutputSanity(
      "Them performance in reading has improved this term.",
      {
        language: "en",
        mode: "report_comment",
        studentFirstName: "Jane",
      },
    )

    expect(result.text).toBe("Their performance in reading has improved this term.")
    expect(result.issues).toContain("pronoun_case")
  })

  it("normalizes malformed parent-message greeting and signoff fragments", () => {
    const result = applyEnglishOutputSanity(
      [
        "Subject Homework update",
        "",
        "Hello Karen..",
        "",
        "I wanted to update you about Jake's reading progress.",
        "",
        "Best regards..",
        "Dr Greg Blackburn",
      ].join("\n"),
      {
        language: "en-GB",
        mode: "parent_message",
      },
    )

    expect(result.text).toContain("Subject: Homework update")
    expect(result.text).toContain("Hello Karen,")
    expect(result.text).toContain("Kind regards,\nDr Greg Blackburn")
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "subject_punctuation",
        "greeting_punctuation",
        "signoff_punctuation",
      ]),
    )
  })

  it("repairs obvious broken agreement for named student references", () => {
    const result = applyEnglishOutputSanity(
      "Jane are contributing more confidently in discussion.",
      {
        language: "en",
        mode: "report_comment",
        studentFirstName: "Jane",
      },
    )

    expect(result.text).toBe("Jane is contributing more confidently in discussion.")
    expect(result.issues).toContain("reference_agreement")
  })

  it("leaves valid English drafts unchanged", () => {
    const draft = [
      "Subject: Reading update",
      "",
      "Hello Karen,",
      "",
      "I wanted to update you on Jake's reading progress this week.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n")

    const result = applyEnglishOutputSanity(draft, {
      language: "en",
      mode: "parent_message",
      studentFirstName: "Jake",
    })

    expect(result.text).toBe(draft)
    expect(result.issues).toEqual([])
  })
})
