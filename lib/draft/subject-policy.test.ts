import { describe, expect, it } from "vitest"

import { applyModeAwareSubjectLine, resolveDraftSubject } from "./subject-policy"

describe("subject-policy", () => {
  it("derives an English parent-message subject from the issue and student name", () => {
    expect(
      resolveDraftSubject({
        mode: "parent_message",
        language: "en",
        situation: "Need to reply about Theo's homework load this week and explain the adjustment I will make tomorrow.",
        studentFirstName: "Theo",
      }),
    ).toBe("Update on Theo's homework")
  })

  it("derives a panic scan follow-up subject for concern-led parent replies", () => {
    expect(
      resolveDraftSubject({
        mode: "parent_message",
        language: "en",
        generationMode: "panic_scan",
        messageType: "parent_complaint",
        situation: "Parent says Maya came home crying after a playground incident and feels unsafe.",
        studentFirstName: "Maya",
      }),
    ).toBe("Follow-up on today's concern about Maya")
  })

  it("preserves an explicit subject from context", () => {
    expect(
      resolveDraftSubject({
        mode: "parent_message",
        language: "en",
        contextSubject: "Today's reading update",
        existingSubject: "Classroom update",
        situation: "Reading progress note.",
      }),
    ).toBe("Today's reading update")
  })

  it("preserves a teacher-authored context subject in teacher_draft mode", () => {
    expect(
      resolveDraftSubject({
        mode: "parent_message",
        language: "en",
        contextSubject: "Reading time this week",
        existingSubject: "Classroom update",
        situation: "Reading progress note.",
        teacherDraftMode: true,
        sourceSubject: "Homework follow-up",
      } as never),
    ).toBe("Reading time this week")
  })

  it("preserves a pasted teacher-draft subject when no context subject is provided", () => {
    expect(
      resolveDraftSubject({
        mode: "parent_message",
        language: "en",
        teacherDraftMode: true,
        sourceSubject: "Homework follow-up",
      } as never),
    ).toBe("Homework follow-up")
  })

  it("returns an empty string when no teacher-draft subject exists", () => {
    expect(
      resolveDraftSubject({
        mode: "parent_message",
        language: "en",
        teacherDraftMode: true,
        situation: "Dear Mrs Smith,\n\nTom forgot his homework again today.",
      } as never),
    ).toBe("")
  })

  it("adds a subject line to parent-facing drafts that omit one", () => {
    const result = applyModeAwareSubjectLine(
      "Hello Jordan,\n\nI wanted to give you a clear update about today's maths lesson.\n\nKind regards,\nDr Greg Blackburn",
      {
        mode: "parent_message",
        language: "en",
        situation: "Need to write about today's maths lesson and the support I will put in place.",
        studentFirstName: "Jordan",
      },
    )

    expect(result).toMatch(/^Subject: Update on Jordan's maths lesson/)
    expect(result).toContain("Hello Jordan,")
  })

  it("does not generate a subject line for teacher_draft mode when none exists", () => {
    const result = applyModeAwareSubjectLine(
      "Dear Mrs Smith,\n\nTom forgot his homework again today.",
      {
        mode: "parent_message",
        language: "en",
        situation: "Dear Mrs Smith,\n\nTom forgot his homework again today.",
        teacherDraftMode: true,
      } as never,
    )

    expect(result).toBe("Dear Mrs Smith,\n\nTom forgot his homework again today.")
  })

  it("preserves teacher_draft paragraph breaks when no subject exists", () => {
    const draft = [
      "Dear Mrs Chen,",
      "",
      "Sally arrived upset this morning.",
      "",
      "She left her pencil case in the corridor.",
      "",
      "Please speak with her this evening.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    const result = applyModeAwareSubjectLine(draft, {
      mode: "parent_message",
      language: "en",
      situation: draft,
      teacherDraftMode: true,
    } as never)

    expect(result).toBe(draft)
  })

  it("removes subject lines from report comments", () => {
    const result = applyModeAwareSubjectLine(
      "Subject: Weekly report\n\nSam listens carefully in paired work and contributes more consistently during discussion.",
      {
        mode: "report_comment",
        language: "en",
        situation: "Report comment.",
      },
    )

    expect(result).not.toContain("Subject:")
    expect(result).toBe(
      "Sam listens carefully in paired work and contributes more consistently during discussion.",
    )
  })
})
