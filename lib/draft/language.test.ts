import { describe, expect, it } from "vitest"

import {
  canonicalizeLocaleIdentifier,
  resolveEditableTextLang,
  resolveLanguageChoiceFromLocale,
  resolveOutputLanguage,
} from "@/lib/draft/language"

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

  it("normalizes uppercase codes to German when hints include DE/GE", () => {
    expect(resolveOutputLanguage({ explicit: "DE" })).toBe("de")
    expect(resolveOutputLanguage({ explicit: "GE" })).toBe("de")
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

describe("resolveEditableTextLang", () => {
  it("returns de for German locales", () => {
    expect(resolveEditableTextLang("de-DE")).toBe("de")
    expect(resolveEditableTextLang("de_CH")).toBe("de")
  })

  it("returns en-GB for English and missing locales", () => {
    expect(resolveEditableTextLang("en-GB")).toBe("en-GB")
    expect(resolveEditableTextLang("en-US")).toBe("en-GB")
    expect(resolveEditableTextLang("")).toBe("en-GB")
    expect(resolveEditableTextLang()).toBe("en-GB")
  })
})

describe("canonicalizeLocaleIdentifier", () => {
  it("maps known locale codes to canonical forms", () => {
    expect(canonicalizeLocaleIdentifier("DE")).toBe("de-DE")
    expect(canonicalizeLocaleIdentifier("GE")).toBe("de-DE")
    expect(canonicalizeLocaleIdentifier("en_us")).toBe("en-GB")
    expect(canonicalizeLocaleIdentifier("")).toBeNull()
  })
})
