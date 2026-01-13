// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { ReframeExplanation } from "@/components/reframe-explanation"

type LocaleKey = "en-GB" | "de-DE"

const localeMessages: Record<LocaleKey, Record<string, string>> = {
  "en-GB": {
    "editor.reframeTier.tier1": "Tier 1 · Gentle rephrase",
    "editor.reframeNoticeSummary": "Why we softened the tone",
    "editor.reframeNotice": "I softened the wording to keep it professional and parent-appropriate.",
    "editor.reframeNoticeDetails":
      "We replaced judgmental language with constructive, strength-focused observations so the message stays professional and supportive.",
  },
  "de-DE": {
    "editor.reframeTier.tier1": "Stufe 1 · Sanfte Umformulierung",
    "editor.reframeNoticeSummary": "Warum wir den Ton angepasst haben",
    "editor.reframeNotice": "Ich habe die Formulierung abgeschwächt, damit sie professionell und für Eltern angemessen bleibt.",
    "editor.reframeNoticeDetails":
      "Wir haben wertende Sprache durch konstruktive, stärkenorientierte Beobachtungen ersetzt, damit die Nachricht professionell und unterstützend bleibt.",
  },
}

let currentLocale: LocaleKey = "en-GB"

const setMockLocale = (locale: LocaleKey) => {
  currentLocale = locale
}

const t = (key: string) => {
  return localeMessages[currentLocale][key] ?? localeMessages["en-GB"][key] ?? key
}

vi.mock("@/hooks/use-locale", () => {
  return {
    useLocale: () => ({
      locale: currentLocale,
      t,
    }),
  }
})

describe("ReframeExplanation", () => {
  afterEach(() => {
    setMockLocale("en-GB")
  })

  it("shows the English tier label and explanation", () => {
    render(<ReframeExplanation tier="tier1" />)
    expect(screen.getByText("Tier 1 · Gentle rephrase")).toBeInTheDocument()
    expect(screen.getByText("Why we softened the tone")).toBeInTheDocument()
    expect(
      screen.getByText("I softened the wording to keep it professional and parent-appropriate."),
    ).toBeInTheDocument()
  })

  it("renders the German copy when the locale is de-DE", () => {
    setMockLocale("de-DE")
    render(<ReframeExplanation tier="tier1" />)
    expect(screen.getByText("Stufe 1 · Sanfte Umformulierung")).toBeInTheDocument()
    expect(screen.getByText("Warum wir den Ton angepasst haben")).toBeInTheDocument()
    expect(
      screen.getByText("Ich habe die Formulierung abgeschwächt, damit sie professionell und für Eltern angemessen bleibt."),
    ).toBeInTheDocument()
  })
})
