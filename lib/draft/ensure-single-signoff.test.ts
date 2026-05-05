import { describe, expect, it } from "vitest"
import { ensureSingleSignOff, normalizeClosingBlock, stripSignOff } from "./ensure-single-signoff"

describe("ensureSingleSignOff", () => {
  it("replaces an existing English sign-off with canonical closing", () => {
    const input = "Hello Elena,\n\nThanks.\n\nBest regards,\nDr Greg Blackburn"
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn", "en")

    expect(out).toContain("Kind regards,\nDr Greg Blackburn")
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((out.match(/Best regards/gi) ?? []).length).toBe(0)
  })

  it("replaces an existing German sign-off with canonical closing", () => {
    const input = "Liebe Familie,\n\nDanke.\n\nMit freundlichen Grüßen,\nFrau Müller"
    const out = ensureSingleSignOff(input, "Frau Müller", "de")

    expect(out).toContain("Mit freundlichen Grüßen,\nFrau Müller")
    expect((out.match(/Mit freundlichen Grüßen,/gi) ?? []).length).toBe(1)
  })

  it("appends canonical closing when missing", () => {
    const input = "Hello,\n\nThis is a short note."
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn", "en")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
  })

  it("deduplicates multiple trailing sign-offs", () => {
    const input =
      "Hi,\n\nThanks.\n\nBest regards,\nDr Greg Blackburn\n\nKind regards,\nDr Greg Blackburn"
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn", "en")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
  })

  it("deduplicates concatenated inline sign-offs", () => {
    const input =
      "Hello,\n\nThanks for your patience.\n\nBest regards, Dr Greg Blackburn Kind regards, Dr Greg Blackburn"
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn", "en")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((out.match(/Best regards/gi) ?? []).length).toBe(0)
  })

  it("preserves umlauts and avoids mojibake", () => {
    const input =
      "Liebe Familie,\n\nDie Schüler grüßen die neue Lehrerin und freuen sich auf die Förderung.\n\nMit freundlichen Grüßen,\nFrau Müller"
    const out = ensureSingleSignOff(input, "Frau Müller", "de")

    expect(out).toContain("Schüler")
    expect(out).toContain("grüßen")
    expect(out).toContain("Mit freundlichen Grüßen,\nFrau Müller")
    expect(out).not.toMatch(/Ã./)
  })

  it("preserves additional signature lines in the canonical block", () => {
    const input =
      "Hello family,\n\nQuick update.\n\nBest regards,\nDr Greg Blackburn\nHeadteacher"
    const out = normalizeClosingBlock(input, {
      locale: "en",
      signatureLines: ["Dr Greg Blackburn", "Headteacher"],
    })

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn\nHeadteacher")).toBe(true)
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
  })

  it("preserves a teacher-authored Best wishes closing block without duplicating it", () => {
    const input =
      "Hello family,\n\nQuick update.\n\nBest wishes,\nMr Blackburn"
    const out = normalizeClosingBlock(input, {
      locale: "en",
      closingLineOverride: "Best wishes,",
      signatureLines: ["Mr Blackburn"],
    })

    expect(out.endsWith("Best wishes,\nMr Blackburn")).toBe(true)
    expect((out.match(/Best wishes,/gi) ?? []).length).toBe(1)
    expect(out).not.toContain("Kind regards,")
  })

  it("removes closings entirely when requested", () => {
    const input = "Report text.\n\nBest regards,\nDr Greg Blackburn"
    const out = normalizeClosingBlock(input, { locale: "en", omit: true })

    expect(out).toBe("Report text.")
  })

  it("strips stacked closing blocks before re-appending", () => {
    const input =
      "Hello family.\n\nBest regards,\nDr Greg Blackburn\nHeadteacher\n\nKind regards,\nDr Greg Blackburn"
    const out = stripSignOff(input)

    expect(out).toBe("Hello family.")
  })
})
