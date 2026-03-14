import { describe, expect, it } from "vitest"

import { inferPanicScanLanguageFromSourceText, resolvePanicScanLocale } from "./locale"

describe("resolvePanicScanLocale", () => {
  it("prefers explicit UI locale over source-text inference", () => {
    const result = resolvePanicScanLocale({
      uiLocale: "en-GB",
      sourceText: "Sehr geehrte Eltern, die Hausaufgaben waren heute zu viel.",
    })

    expect(result).toEqual({
      language: "en",
      source: "ui_locale",
    })
  })

  it("infers German from source text when no UI locale is provided", () => {
    expect(
      inferPanicScanLanguageFromSourceText(
        "Sehr geehrte Eltern, die Hausaufgaben waren heute zu viel und ich bitte um eine Rückmeldung.",
      ),
    ).toBe("de")
  })

  it("defaults to English when no signal points to German", () => {
    const result = resolvePanicScanLocale({
      sourceText: "",
    })

    expect(result).toEqual({
      language: "en",
      source: "default",
    })
  })
})
