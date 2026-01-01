import type { ReactNode } from "react"

import { describe, expect, it, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"

import { LanguageProvider, useLocale, resolveLocale } from "@/hooks/use-locale"

describe("resolveLocale", () => {
  it("maps shorthand locales to supported codes", () => {
    expect(resolveLocale("en")).toBe("en-GB")
    expect(resolveLocale("EN-us")).toBe("en-US")
    expect(resolveLocale("de")).toBe("de-DE")
  })

  it("defaults to en-GB when the input is empty or unknown", () => {
    expect(resolveLocale("")).toBe("en-GB")
    expect(resolveLocale("es")).toBe("en-GB")
  })
})

describe("LanguageProvider", () => {
  afterEach(() => {
    localStorage.removeItem("zaza.lang")
  })

  it("falls back to English translations for unsupported stored locales", () => {
    localStorage.setItem("zaza.lang", "en")

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    )

    const { result } = renderHook(() => useLocale(), { wrapper })
    expect(result.current.t("insights.unlimitedDrafts")).toBe("Unlimited drafts")
    expect(result.current.t("insights.draftsUsed", { used: 1, limit: 5 })).toContain("drafts")
  })
})
