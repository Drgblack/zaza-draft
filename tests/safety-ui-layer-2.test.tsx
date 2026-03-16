import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ExplanationPanel } from "@/src/components/ExplanationPanel"
import { ReactionForecast } from "@/src/components/ReactionForecast"

describe("ReactionForecast", () => {
  it("renders nothing for low risk", () => {
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

    expect(container).toBeEmptyDOMElement()
  })

  it("renders a collapsed expandable panel for medium risk", async () => {
    render(
      <ReactionForecast
        riskLevel="medium"
        forecast={{
          collaborative: 45,
          concerned: 30,
          defensive: 15,
          hostile: 5,
          confused: 5,
        }}
      />,
    )

    expect(screen.getByRole("button", { name: /Parent Reaction Forecast/i })).toBeInTheDocument()
    expect(screen.queryByText("Collaborative")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Parent Reaction Forecast/i }))

    await waitFor(() => {
      expect(screen.getByText("Collaborative")).toBeVisible()
    })
    expect(screen.getByText("45%")).toBeVisible()
    expect(screen.getByText("Concerned")).toBeVisible()
    expect(screen.getByText("Defensive")).toBeVisible()
    expect(screen.queryByText("Hostile")).toBeNull()
  })

  it("renders expanded immediately for high risk and shows only the top 3 reactions", () => {
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

    expect(screen.getByText("Parent Reaction Forecast")).toBeInTheDocument()
    expect(screen.getByText("Defensive")).toBeVisible()
    expect(screen.getByText("Concerned")).toBeVisible()
    expect(screen.getByText("Hostile")).toBeVisible()
    expect(screen.queryByText("Confused")).toBeNull()
    expect(screen.queryByText("Collaborative")).toBeNull()
    expect(screen.queryByRole("button", { name: /Parent Reaction Forecast/i })).toBeNull()
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
