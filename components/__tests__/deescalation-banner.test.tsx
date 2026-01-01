import "@testing-library/jest-dom"
import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { DeescalationBanner } from "@/components/deescalation-banner"
import type { DeescalationSummary } from "@/lib/deescalation/types"

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
})
