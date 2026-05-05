import { describe, expect, it } from "vitest"

import { sanitizeEmailText } from "./email-sanitizer"

describe("sanitizeEmailText", () => {
  it("drops Gmail UI chrome while keeping the actual parent concern", () => {
    const rawLines = [
      "Sans Serif",
      "Compose",
      "Inbox",
      "99+",
      "Sehr geehrte Eltern,",
      "Die Hausaufgabenmenge ist zuletzt stark gestiegen, daher bitten die Eltern um Unterstützung.",
      "Mit freundlichen Grüßen",
    ]
    const raw = rawLines.join("\n")
    const result = sanitizeEmailText(raw)

    expect(result.cleanText).toContain("Hausaufgabenmenge")
    expect(result.cleanText).not.toContain("Sans Serif")
    expect(result.cleanText).not.toContain("Compose")
    expect(result.cleanText).not.toContain("Inbox")
    expect(result.removedLines).toEqual(
      expect.arrayContaining(["Sans Serif", "Compose", "Inbox", "99+"]),
    )
    expect(result.substantiveLines).toBeGreaterThan(0)
  })

  it("retains the message body even when menu fragments appear", () => {
    const raw = [
      "Search mail",
      "Meet",
      "Toolbar buttons",
      "Inbox",
      "Sehr geehrte Eltern,",
      "Lukas schreibt, dass die vielen Hausaufgaben ihn stark beanspruchen.",
      "Wir möchten gern gemeinsam über eine Lösung sprechen.",
    ].join("\n")
    const result = sanitizeEmailText(raw)

    expect(result.cleanText).toContain("Lukas schreibt")
    expect(result.cleanText).toContain("Hausaufgaben")
    expect(result.cleanText).not.toContain("Search mail")
    expect(result.removedLines).toEqual(
      expect.arrayContaining(["Search mail", "Meet", "Toolbar buttons", "Inbox"]),
    )
  })

  it("does not strip substantive prose that happens to contain words like more or chat", () => {
    const raw = [
      "Dear Lucy's Dad,",
      "I understand that Lucy may feel more comfortable having her phone with her, but classroom rules are clear that phones are not used during lessons.",
      "I'd be happy to chat further if helpful.",
      "Regards,",
      "Greg",
    ].join("\n")
    const result = sanitizeEmailText(raw)

    expect(result.cleanText).toContain("more comfortable")
    expect(result.cleanText).toContain("happy to chat further")
    expect(result.removedLines).toEqual([])
  })

  it("preserves teacher-authored blank lines when requested", () => {
    const raw = [
      "Dear Mrs Chen,",
      "",
      "Sally arrived upset this morning.",
      "",
      "She left her pencil case in the corridor.",
      "",
      "Kind regards,",
      "Shereen P.",
    ].join("\n")

    const result = sanitizeEmailText(raw, { preserveBlankLines: true })

    expect(result.cleanText).toContain("Dear Mrs Chen,\n\nSally arrived upset this morning.")
    expect(result.cleanText).toContain(
      "Sally arrived upset this morning.\n\nShe left her pencil case in the corridor.",
    )
    expect(result.cleanText).toContain(
      "She left her pencil case in the corridor.\n\nKind regards,\nShereen P.",
    )
  })
})
