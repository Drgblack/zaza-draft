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

  it("recognizes a German Betreff subject and preserves paragraph breaks", () => {
    const draft = `Betreff: Wochenbericht Mathematik

Liebe Eltern,

Wir beobachten Fortschritte beim Lesen.

Mit freundlichen Gruessen,
Frau Mueller`
    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBe("Wochenbericht Mathematik")
    expect(formatted.paragraphs).toContain("Liebe Eltern,")
    expect(formatted.paragraphs).toContain("Wir beobachten Fortschritte beim Lesen.")
    const closingParagraph = formatted.paragraphs.find((paragraph) =>
      paragraph.includes("Mit freundlichen Gruessen"),
    )
    expect(closingParagraph).toBeDefined()
    expect(closingParagraph).toContain("Frau Mueller")
  })

  it("creates multiple paragraphs for German text with single-line breaks", () => {
    const draft = `Betreff: Schulprojekt
Liebe Eltern,
Die Schüler haben diese Woche am Gruppenprojekt gearbeitet.
Die Präsentationen haben viel Zuversicht gezeigt.
Vielen Dank für Ihre Unterstützung.
Mit freundlichen Grüßen,
Frau Müller`

    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBe("Schulprojekt")
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(formatted.paragraphs[0]).toContain("Liebe Eltern,")
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Ihre Unterstützung"))).toBe(true)
  })

  it("splits long German single-block text into multiple paragraphs", () => {
    const draft =
      "Betreff: Wochenbericht Mathematik Liebe Eltern, die Klasse hat diese Woche konzentriert gearbeitet und es gab viele Momente, in denen Schüler*innen ihre Ideen geteilt haben. Ich möchte besonders hervorheben, wie die Kooperation in den Gruppenprojekten gewachsen ist und wie Mut gezeigt wurde, neue Wege auszuprobieren. Auch wenn es noch kleine Unsicherheiten gibt, freue ich mich über den Fortschritt und die Zusammenarbeit. Herzliche Grüße, Frau Müller"

    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Wochenbericht Mathematik")
    expect(formatted.paragraphs.length).toBeGreaterThan(2)
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Liebe Eltern,"))).toBe(true)
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Herzliche Grüße"))).toBe(true)
  })
})
