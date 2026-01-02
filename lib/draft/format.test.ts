import { describe, expect, it } from "vitest"
import { formatDraftText } from "./format"

describe("formatDraftText", () => {
  it("extracts subject and paragraphs from structured text", () => {
    const draft = `Subject: Update on homework

Dear family,

Johnny has been trying hard this week.

He still struggles with focus, but he is making small steps.

Best regards,
Your teacher`

    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBe("Update on homework")
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(formatted.paragraphs[0]).toContain("Dear family")
  })

  it("splits single-block text into multiple paragraphs by sentence pairs", () => {
    const draft = "Dear family. Johnny has been trying hard this week. He still struggles with focus. I appreciate the effort."
    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBeUndefined()
    expect(formatted.paragraphs.length).toBeGreaterThan(1)
  })

  it("handles subject and greeting on the same line and creates paragraphs", () => {
    const draft =
      "Subject: Weekly check-in Dear Parents, Johnny has had a few moments where staying focused was hard and the lesson pace felt fast. Best regards, Ms. Thompson"
    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBe("Weekly check-in")
    expect(formatted.paragraphs[0]).toMatch(/Dear Parents,/)
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toMatch(/Best regards,/)
  })

  it("handles empty strings gracefully", () => {
    const formatted = formatDraftText("")
    expect(formatted.paragraphs).toHaveLength(0)
  })

  it("removes markdown bold markers from output", () => {
    const formatted = formatDraftText("Dear Parents,\n\n**Das war toll**\n\nBest wishes,")
    expect(formatted.paragraphs[0]).toContain("Dear Parents")
    expect(formatted.paragraphs[1]).toBe("Das war toll")
    expect(formatted.paragraphs[1]).not.toContain("**")
  })
})
