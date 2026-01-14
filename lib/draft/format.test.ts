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
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Herzliche Gr"))).toBe(true)
  })

  it("synthesizes 3-5 paragraphs for long German blobs lacking blank lines", () => {
    const draft =
      "Betreff: Wochenbericht Liebe Eltern, die Woche begann mit viel Neugier und die Kinder haben sich in den Projekten engagiert. Die Klasse hat sich intensiv mit neuen Lesestrategien beschaeftigt und zeigte dabei eine ruhige Haltung. Im Partnerunterricht konnte ich beobachten, wie sie sich gegenseitig unterstuetzten und Ideen austauschten. Die Praesentation der Ergebnisse war energisch und viele Lernende zeigten Mut, eigene Wege zu finden. Es gab einzelne Situationen, in denen Unruhe aufkam, doch wir fanden gemeinsam klare Schritte, um sie zu ordnen. Ich wuerde gerne einen kurzen Austausch vorschlagen, um die naechsten Schritte zu besprechen. Herzliche Gruesse, Frau Schulze"

    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Wochenbericht")
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(formatted.paragraphs.length).toBeLessThanOrEqual(5)
    expect(formatted.paragraphs[0]).toContain("Liebe Eltern")
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Herzliche Gruesse"))).toBe(true)
  })

  it("does not over-split short German drafts", () => {
    const draft = "Betreff: Kurze Nachricht\n\nDie Schuelerinnen und Schueler haben diese Woche konzentriert gearbeitet."
    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.paragraphs).toHaveLength(1)
  })

  it("keeps existing behavior for English blobs", () => {
    const draft =
      "Subject: Progress update\n\nThe team used the new writing routine this week. The students shared thoughtful ideas in pairs. There were a few distractions, but they regrouped quickly. Sincerely, Ms. Rivera"
    const formatted = formatDraftText(draft, "en-US")
    expect(formatted.paragraphs.length).toBe(2)
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Sincerely"))).toBe(true)
  })
})
