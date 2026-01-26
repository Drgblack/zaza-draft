import { describe, expect, it } from "vitest"
import { ensureSingleSignOff } from "./ensure-single-signoff"

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
})
