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

  it("splits single-block english text into multiple paragraphs by sentences", () => {
    const draft = "Dear family. Johnny has been trying hard this week. He still struggles with focus. I appreciate the effort."
    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBeUndefined()
    expect(formatted.paragraphs.length).toBeGreaterThan(1)
  })

  it("handles subject and greeting on the same line", () => {
    const draft =
      "Subject: Weekly check-in Dear Parents, Johnny has had a few moments where staying focused was hard and the lesson pace felt fast. Best regards, Ms. Thompson"
    const formatted = formatDraftText(draft)
    expect(formatted.subject).toBe("Weekly check-in")
    expect(formatted.paragraphs[0]).toMatch(/Dear Parents,/)
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toMatch(/Best regards,/)
  })

  it("removes markdown markers", () => {
    const formatted = formatDraftText("Dear Parents,\n\n**Das war toll**\n\nBest wishes,")
    expect(formatted.paragraphs[0]).toContain("Dear Parents")
    expect(formatted.paragraphs[0]).toContain("Das war toll")
    expect(formatted.paragraphs[0]).not.toContain("**")
  })

  it("recognizes German Betreff subject and keeps greeting separate", () => {
    const draft = `Betreff - Schulprojekt
Liebe Eltern,

Die Schuelerinnen und Schueler haben diese Woche am Gruppenprojekt gearbeitet.

Vielen Dank fuer Ihre Unterstuetzung.

Herzliche Gruesse,
Frau Mueller`
    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Schulprojekt")
    expect(formatted.paragraphs[0]).toContain("Liebe Eltern,")
    const closing = formatted.paragraphs[formatted.paragraphs.length - 1]
    expect(closing).toContain("Herzliche Gruesse")
  })

  it("puts long German single-block bodies into at least three paragraphs", () => {
    const draft =
      "Betreff: Wochenbericht Liebe Eltern, die Woche begann mit viel Neugier und die Kinder haben sich in den Projekten engagiert. Die Klasse hat sich intensiv mit neuen Lesestrategien beschaeftigt und zeigte dabei eine ruhige Haltung. Im Partnerunterricht konnte ich beobachten, wie sie sich gegenseitig unterstuetzten und Ideen austauschten. Die Praesentation der Ergebnisse war energisch und viele Lernende zeigten Mut, eigene Wege zu finden. Es gab einzelne Situationen, in denen Unruhe aufkam, doch wir fanden gemeinsam klare Schritte, um sie zu ordnen. Ich wuerde gerne einen kurzen Austausch vorschlagen, um die naechsten Schritte zu besprechen. Herzliche Gruesse, Frau Schulze"

    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Wochenbericht")
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(formatted.paragraphs[0]).toContain("Liebe Eltern")
    expect(formatted.paragraphs.some((paragraph) => paragraph.includes("Herzliche Gruesse"))).toBe(true)
  })

  it("splits medium German bodies into at least two paragraphs besides greeting/closing", () => {
    const draft =
      "Betreff | Kurzer Blick Liebe Eltern, diese Woche haben wir im Matheunterricht neue Methoden geprobt und das Feedback zeigt, dass die Kinder zunehmend Fachsprache verwenden. Der Austausch in Kleingruppen war lebendig und viele Schueler nutzten die Chance, Fragen zu stellen, um das Konzept zu festigen. Die Ergebnisse zeigen, dass das Interesse gewachsen ist und wir morgen die Arbeit zusammenfassen wollen. Herzliche Gruesse, Frau Becker"
    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Kurzer Blick")
    expect(formatted.paragraphs.length).toBeGreaterThanOrEqual(3)
  })

  it("keeps greeting and closing as separate paragraphs for English drafts", () => {
    const draft = "Subject: Planning note Dear family, the upcoming project will require more formative checks. Warm regards, Ms. Rivera"
    const formatted = formatDraftText(draft)
    expect(formatted.paragraphs[0]).toContain("Dear family")
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toContain("Warm regards,")
  })
})
