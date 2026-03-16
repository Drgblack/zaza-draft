import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ExplanationPanel } from "@/src/components/ExplanationPanel"
import { ReactionForecast } from "@/src/components/ReactionForecast"

describe("ReactionForecast", () => {
  it("renders the predictor summary even for low risk drafts", () => {
    const { container } = render(
      <ReactionForecast
        riskLevel="low"
        forecast={{
          collaborative: 40,
          concerned: 25,
          defensive: 20,
          hostile: 10,
          confused: 5,
        }}
      />,
    )

    expect(container).not.toBeEmptyDOMElement()
    expect(screen.getByText("Parent Reaction Predictor")).toBeInTheDocument()
    expect(screen.getByText("Escalation Risk")).toBeVisible()
    expect(screen.getByText("LOW")).toBeVisible()
    expect(screen.getByText("Most Likely Reaction")).toBeVisible()
    expect(screen.getByText("Collaborative")).toBeVisible()
    expect(screen.getByText("Tone Recommendation")).toBeVisible()
    expect(screen.getByText("Professional")).toBeVisible()
    expect(screen.queryByText("45%")).toBeNull()
  })

  it("renders a collapsed expandable predictor for medium risk with summary visible", async () => {
    render(
      <ReactionForecast
        riskLevel="medium"
        forecast={{
          collaborative: 25,
          concerned: 30,
          defensive: 40,
          hostile: 5,
          confused: 0,
        }}
      />,
    )

    expect(screen.getByText("Parent Reaction Predictor")).toBeInTheDocument()
    expect(screen.getByText("MEDIUM")).toBeVisible()
    expect(screen.getByText("Defensive")).toBeVisible()
    expect(screen.getByText("Professional + neutral")).toBeVisible()
    expect(screen.queryByText("45%")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Show probability bars/i }))

    await waitFor(() => {
      expect(screen.getByText("40%")).toBeVisible()
    })
    expect(screen.getByText("Concerned")).toBeVisible()
    expect(screen.getAllByText("Defensive").length).toBeGreaterThan(0)
    expect(screen.queryByText("Hostile")).toBeNull()
  })

  it("renders the high-risk interpretation immediately and shows only the top 3 reactions", () => {
    render(
      <ReactionForecast
        riskLevel="high"
        forecast={{
          collaborative: 12,
          concerned: 20,
          defensive: 35,
          hostile: 18,
          confused: 15,
        }}
      />,
    )

    expect(screen.getByText("Parent Reaction Predictor")).toBeInTheDocument()
    expect(screen.getByText("MEDIUM")).toBeVisible()
    expect(screen.getByText("Professional + neutral")).toBeVisible()
    expect(screen.getAllByText("Defensive").length).toBeGreaterThan(0)
    expect(screen.getByText("Concerned")).toBeVisible()
    expect(screen.getByText("Hostile")).toBeVisible()
    expect(screen.queryByText("Confused")).toBeNull()
    expect(screen.queryByText("Collaborative")).toBeNull()
    expect(screen.queryByRole("button", { name: /Show probability bars/i })).toBeNull()
  })
})

describe("ExplanationPanel", () => {
  it("renders nothing when there are no explanation lines", () => {
    const { container } = render(<ExplanationPanel lines={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the heading and caps visible lines at five", () => {
    render(
      <ExplanationPanel
        lines={[
          "Line 1",
          "Line 2",
          "Line 3",
          "Line 4",
          "Line 5",
          "Line 6",
        ]}
      />,
    )

    expect(screen.getByText("Why Draft adjusted this message")).toBeInTheDocument()
    expect(screen.getByText("Line 1")).toBeVisible()
    expect(screen.getByText("Line 5")).toBeVisible()
    expect(screen.queryByText("Line 6")).toBeNull()
  })
})
