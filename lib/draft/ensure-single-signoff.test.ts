import { describe, expect, it } from "vitest"
import { ensureSingleSignOff } from "./ensure-single-signoff"

describe("ensureSingleSignOff", () => {
  it("replaces an existing single-line sign-off with the canonical sign-off", () => {
    const input = "Hello Elena,\n\nThanks for your message.\n\nBest regards, Dr Greg Blackburn"
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((out.match(/Best regards/gi) ?? []).length).toBe(0)
  })

  it("replaces a multi-line sign-off with the canonical sign-off", () => {
    const input = "Hello Elena,\n\nThanks for your message.\n\nBest regards,\nDr Greg Blackburn"
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((out.match(/Best regards/gi) ?? []).length).toBe(0)
  })

  it("appends a canonical sign-off when none exists", () => {
    const input = "Hello Elena,\n\nThanks for your message."
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
  })

  it("falls back to Class teacher when teacherName is empty", () => {
    const input = "Hello,\n\nThanks for your note."
    const out = ensureSingleSignOff(input, "")

    expect(out.endsWith("Kind regards,\nClass teacher")).toBe(true)
  })

  it("deduplicates multiple trailing sign-offs", () => {
    const input =
      "Hello,\n\nThanks.\n\nBest regards,\nDr Greg Blackburn\n\nKind regards,\nDr Greg Blackburn"
    const out = ensureSingleSignOff(input, "Dr Greg Blackburn")

    expect(out.endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((out.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((out.match(/Best regards/gi) ?? []).length).toBe(0)
  })
})
