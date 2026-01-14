import { describe, expect, it } from "vitest"
import { MAX_PARAGRAPH_CHARS, formatDraftText } from "./format"

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

  it("splits long German bodies so each paragraph stays under the soft max", () => {
    const draft =
      "Betreff: Ausblick Liebe Eltern, zurzeit arbeiten wir intensiv an Präsentationen, und die Schüler*innen entwickeln sehr unterschiedliche Lösungswege, die wir gemeinsam erarbeiten. In Gesprächsrunden fallen viele konkrete Fragen, und ich dokumentiere diese, damit wir in den kommenden Treffen gezielt darauf eingehen können. Die Schreibaufgaben werden durchgehend reflektiert, und ich sehe, wie das Interesse daran wächst, neue Formate zu probieren. Ich bitte Sie, die Übungsbögen zu Hause zu besprechen, damit die Kinder ihre Gedanken noch einmal ordnen können. Wir planen ein kurzes Feedback-Gespräch nächste Woche, um auf individuelle Fortschritte einzugehen. Herzliche Gruesse, Frau Meyer"

    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Ausblick")
    expect(formatted.paragraphs[0]).toContain("Liebe Eltern")
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toContain("Herzliche Gruesse")
    formatted.paragraphs.forEach((paragraph) => {
      if (paragraph.includes("Liebe Eltern") || paragraph.includes("Herzliche Gruesse")) {
        return
      }
      expect(paragraph.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS)
    })
  })

  it("splits overly long English paragraphs at sentence boundaries", () => {
    const draft =
      "Subject: Upcoming project Dear family, we have more updates than usual, and to keep everything clear I want to mention that we are reorganizing how we collect portfolios, which means more reflective writing and very focused peer reviews. The new rhythm feels unfamiliar for some students, yet I notice more thoughtful questions arising and an increased sense of ownership. I will gather your feedback by Friday so we can tune the plan together. Warm regards, Ms. Rivera"
    const formatted = formatDraftText(draft, "en-GB")
    expect(formatted.subject).toBe("Upcoming project")
    formatted.paragraphs.forEach((paragraph) => {
      if (paragraph.includes("Dear family") || paragraph.includes("Warm regards")) {
        return
      }
      expect(paragraph.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS)
    })
  })

  it("splits a very long German body while keeping greeting/closing intact", () => {
    const repeatedSentence =
      "Die Lerngruppe hat im Fachunterricht ein komplexes Thema bearbeitet, die Diskussionen waren differenziert und ich dokumentiere die Impulse für unsere nächsten Schritte."
    const longBody = Array(20).fill(repeatedSentence).join(" ")
    const draft = `Betreff: Ausblick\nLiebe Eltern,\n\n${longBody}\n\nHerzliche Gruesse,\nFrau Meyer`

    const formatted = formatDraftText(draft, "de-DE")
    expect(formatted.subject).toBe("Ausblick")
    expect(formatted.paragraphs[0]).toContain("Liebe Eltern")
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toContain("Herzliche Gruesse")
    const bodyParagraphs = formatted.paragraphs.slice(1, -1)
    expect(bodyParagraphs.length).toBeGreaterThanOrEqual(3)
    bodyParagraphs.forEach((paragraph) => {
      expect(paragraph.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS)
    })
  })

  it("splits a very long English body without trimming greeting/closing", () => {
    const repeatedSentence =
      "Weriched our cycle by testing variations of the routine, and every refinement adds clarity to the learners' portfolios."
    const longBody = Array(18).fill(repeatedSentence).join(" ")
    const draft = `Subject: Routine update\nDear family,\n\n${longBody}\n\nWarm regards,\nMs. Rivera`

    const formatted = formatDraftText(draft, "en-GB")
    expect(formatted.subject).toBe("Routine update")
    expect(formatted.paragraphs[0]).toContain("Dear family")
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toContain("Warm regards")
    const bodyParagraphs = formatted.paragraphs.slice(1, -1)
    expect(bodyParagraphs.length).toBeGreaterThanOrEqual(3)
    bodyParagraphs.forEach((paragraph) => {
      expect(paragraph.length).toBeLessThanOrEqual(MAX_PARAGRAPH_CHARS)
    })
  })

  it("keeps greeting and closing as separate paragraphs for English drafts", () => {
    const draft = "Subject: Planning note Dear family, the upcoming project will require more formative checks. Warm regards, Ms. Rivera"
    const formatted = formatDraftText(draft)
    expect(formatted.paragraphs[0]).toContain("Dear family")
    expect(formatted.paragraphs[formatted.paragraphs.length - 1]).toContain("Warm regards,")
  })
})
