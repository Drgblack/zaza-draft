import { describe, expect, it } from "vitest"

import { normalizeGermanParentMessage } from "./german-normalizer"

describe("normalizeGermanParentMessage", () => {
  it("enforces the Betreff template with greeting, paragraph breaks, and closing", () => {
    const input =
      "Betreff: Wochenupdate Liebe Eltern, ich möchte über die jüngsten Beobachtungen berichten. Die Klasse zeigte Engagement, das sich durch ruhigeres Arbeiten gezeigt hat. Es gab ein paar Momente, in denen einige Kinder faul wirkten, aber wir haben gemeinsam Strategien ausprobiert. Herzliche Grüße, Frau Müller"
    const output = normalizeGermanParentMessage(input)

    expect(output.text).toContain("Betreff: Wochenupdate")
    expect(output.text).toMatch(/Betreff: Wochenupdate\n\nLiebe Eltern,/)
    expect(output.text).toMatch(/Herzliche Gr/)
    expect(output.text.trim().endsWith("Frau Müller")).toBe(true)
    expect((output.text.match(/Betreff:/g) ?? []).length).toBe(1)
    expect(output.text).toContain("\n\nLiebe Eltern,\n\n")
    expect(output.text).not.toMatch(/Ausreden|Lügen|faul/i)
    expect(output.neutralized).toBe(true)
  })

  it("reports neutralization status when no judgemental terms are present", () => {
    const input = "Betreff: Update Liebe Eltern, die Klasse macht Fortschritte. Herzliche Grüße, Herr Meier"
    const output = normalizeGermanParentMessage(input)

    expect(output.neutralized).toBe(false)
    expect(output.text).toContain("Herzliche Grüße")
  })
})
