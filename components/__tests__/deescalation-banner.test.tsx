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
    "deescalation.helper.insult": "Use neutral descriptions of the behaviour and its impact.",
    "deescalation.helper.threat": "Offer clear next steps instead of consequences or ultimatums.",
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
    "deescalation.helper.insult": "Beschreiben Sie das Verhalten und dessen Auswirkungen neutral und ohne Beschimpfungen.",
    "deescalation.helper.threat": "Bieten Sie klare nächste Schritte an, statt mit Konsequenzen oder Ultimaten zu drohen.",
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

const threatSummary: DeescalationSummary = {
  ...baseSummary,
  flaggedPhrases: [
    {
      originalSnippet: "I will remove your privileges",
      category: "threat",
      suggestionSnippet: "Offer guidance instead of consequences.",
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

  it("renders the English helper text for threat guidance", () => {
    render(<DeescalationBanner summary={threatSummary} />)
    const toggle = screen.getByRole("button", { name: /see what changed/i })
    fireEvent.click(toggle)
    expect(
      screen.getByText(/Offer clear next steps instead of consequences or ultimatums./),
    ).toBeInTheDocument()
  })

  it("renders German copy when the locale is de-DE", () => {
    setLocale("de-DE")
    render(<DeescalationBanner summary={threatSummary} />)

    const toggle = screen.getByRole("button", { name: /Änderungen anzeigen/i })
    expect(toggle).toBeInTheDocument()
    expect(screen.getByText("Beruhigt und professionell")).toBeInTheDocument()
    expect(screen.queryByText("Calmed and professionalised")).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveTextContent("Änderungen ausblenden")
    expect(screen.getByText("Problematische Formulierung")).toBeInTheDocument()
    expect(
      screen.getByText(
        /Bieten Sie klare nächste Schritte an, statt mit Konsequenzen oder Ultimaten zu drohen./,
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Offer clear next steps instead of consequences or ultimatums./),
    ).not.toBeInTheDocument()
  })
})
