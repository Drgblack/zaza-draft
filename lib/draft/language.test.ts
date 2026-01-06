import { describe, expect, it } from "vitest"

import { resolveLanguageChoiceFromLocale, resolveOutputLanguage } from "@/lib/draft/language"

describe("resolveOutputLanguage", () => {
  it("prefers explicit output language over other hints", () => {
    const result = resolveOutputLanguage({
      explicit: "de",
      preferred: "en",
      uiLocale: "en-US",
      acceptLanguage: "en-US,en;q=0.9",
    })
    expect(result).toBe("de")
  })

  it("falls back to preferred language when explicit is missing", () => {
    const result = resolveOutputLanguage({
      preferred: "de",
      uiLocale: "en-US",
      acceptLanguage: "en-US,en;q=0.9",
    })
    expect(result).toBe("de")
  })

  it("uses the UI locale when no explicit or preferred language is set", () => {
    const result = resolveOutputLanguage({
      uiLocale: "de-DE",
      acceptLanguage: "en-US,en;q=0.9",
    })
    expect(result).toBe("de")
  })

  it("falls back to the Accept-Language header when no other hints are available", () => {
    const result = resolveOutputLanguage({
      acceptLanguage: "de-CH,de;q=0.9,en;q=0.8",
    })
    expect(result).toBe("de")
  })

  it("defaults to English when no hints are provided", () => {
    const result = resolveOutputLanguage({})
    expect(result).toBe("en")
  })
})

describe("resolveLanguageChoiceFromLocale", () => {
  it("returns German when locale starts with de", () => {
    expect(resolveLanguageChoiceFromLocale("de-DE")).toBe("de")
    expect(resolveLanguageChoiceFromLocale("de_CH")).toBe("de")
  })

  it("defaults to English for other locales and missing values", () => {
    expect(resolveLanguageChoiceFromLocale("en-GB")).toBe("en")
    expect(resolveLanguageChoiceFromLocale("")).toBe("en")
    expect(resolveLanguageChoiceFromLocale()).toBe("en")
  })
})
