import type { ReactNode } from "react"

import { describe, expect, it, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"

import { LanguageProvider, useLocale, resolveLocale } from "@/hooks/use-locale"

describe("resolveLocale", () => {
  it("maps shorthand locales to supported codes", () => {
    expect(resolveLocale("en")).toBe("en-GB")
    expect(resolveLocale("EN-us")).toBe("en-US")
    expect(resolveLocale("de")).toBe("de-DE")
    expect(resolveLocale("en-UK")).toBe("en-GB")
    expect(resolveLocale("en_gb")).toBe("en-GB")
    expect(resolveLocale("DE_de")).toBe("de-DE")
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

  it("returns German translations when the locale is set to de-DE", () => {
    localStorage.setItem("zaza.lang", "de-DE")

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    )

    const { result } = renderHook(() => useLocale(), { wrapper })
    expect(result.current.t("header.insightsButtonLabel")).toBe("Meine Einblicke")
  })

  it("falls back to British English labels for en-UK input", () => {
    localStorage.setItem("zaza.lang", "en-UK")

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    )

    const { result } = renderHook(() => useLocale(), { wrapper })
    expect(result.current.t("header.insightsButtonLabel")).toBe("My insights")
    expect(result.current.t("editor.mode.label")).toBe("Mode")
    expect(result.current.t("editor.mode.parentMessage")).toBe("Parent message")
    expect(result.current.t("editor.mode.reportComment")).toBe("Report comment")
  })
})
