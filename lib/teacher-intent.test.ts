import { describe, expect, it } from "vitest"

import { classifyTeacherIntent } from "@/lib/teacher-intent"

describe("classifyTeacherIntent", () => {
  it("classifies complaint replies without storing source text", () => {
    expect(
      classifyTeacherIntent({
        situation:
          "A parent has complained that homework has been overwhelming and wants a clear response.",
        draftMode: "parent_message",
        documentationMode: false,
        messageType: "parent_complaint",
        messageDirection: "parent_to_teacher",
      }),
    ).toBe("respond_to_complaint")
  })

  it("classifies documentation and safeguarding flows distinctly", () => {
    expect(
      classifyTeacherIntent({
        situation: "Please document the incident factually for the school record.",
        draftMode: "parent_message",
        documentationMode: true,
        messageDirection: "teacher_internal_notes",
      }),
    ).toBe("document_incident")

    expect(
      classifyTeacherIntent({
        situation: "Create a safeguarding note about an unsafe disclosure made during break.",
        draftMode: "parent_message",
        documentationMode: false,
        messageDirection: "teacher_internal_notes",
      }),
    ).toBe("safeguarding_note")
  })

  it("detects progress, praise, and attendance intents", () => {
    expect(
      classifyTeacherIntent({
        situation: "Share an update on the student's strong progress in reading this term.",
        draftMode: "report_comment",
        documentationMode: false,
        messageDirection: "teacher_internal_notes",
      }),
    ).toBe("share_progress")

    expect(
      classifyTeacherIntent({
        situation: "Write a short note praising the student for excellent teamwork and effort.",
        draftMode: "report_comment",
        documentationMode: false,
        messageDirection: "teacher_internal_notes",
      }),
    ).toBe("praise_student")

    expect(
      classifyTeacherIntent({
        situation: "Draft a message about repeated lateness and attendance concerns this week.",
        draftMode: "parent_message",
        documentationMode: false,
        messageDirection: "teacher_internal_notes",
      }),
    ).toBe("attendance_issue")
  })
})
