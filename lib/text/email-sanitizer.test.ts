import { describe, expect, it } from "vitest"

import { sanitizeEmailText } from "./email-sanitizer"

describe("sanitizeEmailText", () => {
  it("drops Gmail UI chrome while keeping the actual parent concern", () => {
    const rawLines = [
      "Gmail",
      "Inbox",
      "99+",
      "Sehr geehrte Eltern,",
      "Die Hausaufgabenmenge ist zuletzt stark gestiegen, daher bitten die Eltern um Unterstützung.",
      "Mit freundlichen Grüßen",
    ]
    const raw = rawLines.join("\n")
    const result = sanitizeEmailText(raw)

    expect(result.cleanText).toContain("Hausaufgabenmenge")
    expect(result.cleanText).not.toContain("Gmail")
    expect(result.removedLines).toEqual(expect.arrayContaining(["Gmail", "Inbox", "99+"]))
    expect(result.substantiveLines).toBeGreaterThan(0)
  })
})
