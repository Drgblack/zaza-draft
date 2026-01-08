// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import SupportPage from "@/app/support/page"
import SupportGuidesPage from "@/app/support/guides/page"
import SupportCommunityPage from "@/app/support/community/page"
import SupportContactPage from "@/app/support/contact/page"

type Locale = "en-GB" | "de-DE"
let currentLocale: Locale = "en-GB"

const translations: Record<Locale, Record<string, string>> = {
  "en-GB": {
    "support.title": "Support & help",
    "support.guides.title": "Guided support",
    "support.community.title": "Community & collaboration",
    "support.contact.title": "Contact support",
    "support.contact.button": "Send request",
  },
  "de-DE": {
    "support.title": "Support & Hilfe",
    "support.guides.title": "Geführte Hilfestellung",
    "support.community.title": "Community & Zusammenarbeit",
    "support.contact.title": "Support kontaktieren",
    "support.contact.button": "Anfrage senden",
  },
}

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: currentLocale,
    t: (key: string) => translations[currentLocale][key] ?? key,
    setLocale: vi.fn(),
  }),
}))

describe("Support pages localization", () => {
  beforeEach(() => {
    currentLocale = "en-GB"
    vi.clearAllMocks()
  })

  const pageAssertions = [
    { Component: SupportPage, key: "support.title" },
    { Component: SupportGuidesPage, key: "support.guides.title" },
    { Component: SupportCommunityPage, key: "support.community.title" },
    { Component: SupportContactPage, key: "support.contact.title" },
  ]

  pageAssertions.forEach(({ Component, key }) => {
    it(`shows English copy for ${key}`, () => {
      currentLocale = "en-GB"
      render(<Component />)
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(translations["en-GB"][key])
    })

    it(`shows German copy for ${key}`, () => {
      currentLocale = "de-DE"
      render(<Component />)
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(translations["de-DE"][key])
    })
  })
})
