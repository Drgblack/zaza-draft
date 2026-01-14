// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { DeescalationBanner } from "@/components/deescalation-banner"
import type { DeescalationSummary } from "@/lib/deescalation/types"

type LocaleKey = "en-GB" | "de-DE"

const translations: Record<LocaleKey, Record<string, string>> = {
  "en-GB": {
    "deescalation.title": "Calmed and professionalised",
    "deescalation.description": "I softened a few high-emotion phrases to keep this message safe and effective.",
    "deescalation.button.show": "See what changed",
    "deescalation.button.hide": "Hide changes",
    "deescalation.diff.original": "Original:",
    "deescalation.diff.suggestion": "Calmer alternative:",
    "deescalation.category.insult": "Insult",
    "deescalation.category.threat": "Threat",
  },
  "de-DE": {
    "deescalation.title": "Beruhigt und professionell",
    "deescalation.description":
      "Ich habe ein paar emotional aufgeladene Formulierungen entschärft, damit die Nachricht sicher und wirkungsvoll bleibt.",
    "deescalation.button.show": "Änderungen anzeigen",
    "deescalation.button.hide": "Änderungen ausblenden",
    "deescalation.diff.original": "Original:",
    "deescalation.diff.suggestion": "Beruhigte Alternative:",
    "deescalation.category.insult": "Beleidigung",
    "deescalation.category.threat": "Problematische Formulierung",
  },
}

let currentLocale: LocaleKey = "en-GB"

const setLocale = (locale: LocaleKey) => {
  currentLocale = locale
}

vi.mock("@/hooks/use-locale", () => {
  return {
    useLocale: () => ({
      locale: currentLocale,
      t: (key: string) => translations[currentLocale][key] ?? key,
    }),
  }
})
const baseSummary: DeescalationSummary = {
  wasDeescalated: true,
  coachingLine: "I kept your intent but softened a few phrases so the message lands well and stays professional.",
  flaggedPhrases: [
    {
      originalSnippet: "Johnny's lies",
      category: "insult",
      suggestionSnippet: "Describe the inaccurate information instead.",
    },
  ],
}

afterEach(() => {
  setLocale("en-GB")
})

describe("DeescalationBanner", () => {
  it("shows details when the summary flags phrases", () => {
    render(<DeescalationBanner summary={baseSummary} />)

    expect(screen.getByText("Calmed and professionalised")).toBeInTheDocument()
    const button = screen.getByRole("button", { name: /see what changed/i })
    fireEvent.click(button)
    expect(screen.getByText(/Original:/)).toBeInTheDocument()
    expect(screen.getByText("Johnny's lies")).toBeInTheDocument()
    expect(screen.getByText(/Calmer alternative:/)).toBeInTheDocument()
  })

  it("toggles the CTA label and aria state", () => {
    render(<DeescalationBanner summary={baseSummary} />)

    const toggle = screen.getByRole("button", { name: /see what changed/i })
    expect(toggle).toHaveTextContent("See what changed")
    expect(toggle).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(toggle)
    expect(toggle).toHaveTextContent("Hide changes")
    expect(toggle).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(toggle)
    expect(toggle).toHaveTextContent("See what changed")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  it("is hidden when there was no de-escalation", () => {
    const calmSummary: DeescalationSummary = {
      ...baseSummary,
      wasDeescalated: false,
      flaggedPhrases: [],
    }
    render(<DeescalationBanner summary={calmSummary} />)
    expect(screen.queryByText("Calmed and professionalised")).toBeNull()
  })

  it("locks the supportive banner copy", () => {
    render(<DeescalationBanner summary={baseSummary} />)
    expect(screen.getByText("Calmed and professionalised")).toBeInTheDocument()
    expect(
      screen.getByText("I softened a few high-emotion phrases to keep this message safe and effective."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /see what changed/i })).toBeInTheDocument()
  })

  it("collapses when a new summary is provided", () => {
    const { rerender } = render(<DeescalationBanner summary={baseSummary} />)
    const toggle = screen.getByRole("button", { name: /see what changed/i })
    fireEvent.click(toggle)
    expect(toggle).toHaveTextContent("Hide changes")

    const nextSummary: DeescalationSummary = {
      ...baseSummary,
      flaggedPhrases: [
        {
          originalSnippet: "This is rough",
          category: "sarcasm",
          suggestionSnippet: "Try a calmer description.",
        },
      ],
    }
    rerender(<DeescalationBanner summary={nextSummary} />)

    expect(toggle).toHaveTextContent("See what changed")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps the snippet visible when showing the explanation", () => {
    render(
      <>
        <div data-testid="current-snippet">Current snippet</div>
        <DeescalationBanner summary={baseSummary} />
    </>,
  )

  const toggle = screen.getByRole("button", { name: /see what changed/i })
  fireEvent.click(toggle)
  expect(screen.getByTestId("current-snippet")).toBeInTheDocument()
})

  it("renders German copy when the locale is de-DE", () => {
    setLocale("de-DE")
    render(<DeescalationBanner summary={baseSummary} />)

    const toggle = screen.getByRole("button", { name: /Änderungen anzeigen/i })
    expect(toggle).toBeInTheDocument()
    expect(screen.getByText("Beruhigt und professionell")).toBeInTheDocument()
    expect(screen.queryByText("Calmed and professionalised")).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveTextContent("Änderungen ausblenden")
    expect(screen.getByText("Beleidigung")).toBeInTheDocument()
  })
})
