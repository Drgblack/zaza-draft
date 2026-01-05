import { describe, expect, it } from "vitest"

import { normalizeGermanParentMessage } from "./german-normalizer"

describe("normalizeGermanParentMessage", () => {
  it("enforces the Betreff template with greeting, paragraph breaks, and closing", () => {
    const input =
      "Betreff: Wochenupdate Liebe Eltern, ich möchte über die jüngsten Beobachtungen berichten. Die Klasse zeigte Engagement, das sich durch ruhigeres Arbeiten gezeigt hat. Es gab ein paar Momente, in denen Konzentration schwierig war, aber wir haben gemeinsam Strategien ausprobiert. Herzliche Grüße, Frau Müller"
    const output = normalizeGermanParentMessage(input)

    expect(output).toContain("Betreff: Wochenupdate")
    expect(output).toMatch(/Betreff: Wochenupdate\n\nLiebe Eltern,/)
    expect(output).toMatch(/\n\nHerzliche Grüße,/)
    expect(output.trim().endsWith("Frau Müller")).toBe(true)
    expect((output.match(/Betreff:/g) ?? []).length).toBe(1)
    expect(output).toMatch(/\n\n.+?\n\n.+?\n\n/)
    expect(output).not.toMatch(/Ausreden|Lügen|faul/i)
  })
})
