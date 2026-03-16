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

  it("replaces institutional parent-message phrasing with natural teacher wording", () => {
    const result = applyEnglishOutputSanity(
      "The student found the learning tasks difficult during instruction time, but the student's effort stayed steady.",
      {
        language: "en",
        mode: "parent_message",
        studentFirstName: "Jake",
      },
    )

    expect(result.text).toBe(
      "Jake found the classwork difficult during class, but Jake's effort stayed steady.",
    )
    expect(result.issues).toContain("parent_voice")
  })

  it("tightens consultant-style parent-message boilerplate into teacher wording", () => {
    const result = applyEnglishOutputSanity(
      "I would like to identify specific supports that would be useful and explore whether additional support strategies might be helpful to support his overall learning experience.",
      {
        language: "en",
        mode: "parent_message",
        studentFirstName: "Oliver",
      },
    )

    expect(result.text).toBe(
      "I would like to see what might help and explore whether practical next steps might be helpful to help him feel more successful at school.",
    )
    expect(result.issues).toContain("parent_voice")
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
