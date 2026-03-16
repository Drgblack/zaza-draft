import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ExplanationPanel } from "@/src/components/ExplanationPanel"
import { ReactionForecast } from "@/src/components/ReactionForecast"

describe("ReactionForecast", () => {
  it("normalizes the rendered full forecast so visible percentages total exactly 100", async () => {
    render(
      <ReactionForecast
        riskLevel="medium"
        forecast={{
          collaborative: 20,
          concerned: 20,
          defensive: 20,
          hostile: 10,
          confused: 15,
        }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Show probability bars/i }))

    await waitFor(() => {
      expect(screen.getByText("24%")).toBeVisible()
    })
    const percentages = screen
      .getAllByText(/%$/)
      .map((node) => Number.parseInt(node.textContent ?? "0", 10))
      .filter((value) => Number.isFinite(value))

    expect(percentages).toEqual(expect.arrayContaining([24, 23, 23, 18, 12]))
    expect(percentages.reduce((sum, value) => sum + value, 0)).toBe(100)
  })

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

  it("renders a collapsed expandable predictor for medium risk with the full five-state model once expanded", async () => {
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
    expect(screen.getByText("Hostile")).toBeVisible()
    expect(screen.getByText("Confused")).toBeVisible()
    expect(screen.getByText("Concerned")).toBeVisible()
    expect(screen.getAllByText("Defensive").length).toBeGreaterThan(0)
    expect(screen.getByText("Collaborative")).toBeVisible()
    expect(screen.queryByText("Showing the three most likely parent reactions.")).toBeNull()
  })

  it("renders the high-risk interpretation immediately and shows the full five-state forecast", () => {
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
    expect(screen.getByText("Confused")).toBeVisible()
    expect(screen.getByText("Collaborative")).toBeVisible()
    expect(screen.queryByText("Showing the three most likely parent reactions.")).toBeNull()
    expect(screen.queryByRole("button", { name: /Show probability bars/i })).toBeNull()
  })

  it("only renders the supported reaction categories in expanded mode", async () => {
    render(
      <ReactionForecast
        riskLevel="medium"
        forecast={{
          collaborative: 12,
          concerned: 18,
          defensive: 30,
          hostile: 25,
          confused: 15,
        }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Show probability bars/i }))

    await waitFor(() => {
      expect(screen.getByText("Hostile")).toBeVisible()
    })
    expect(screen.getAllByText("Defensive").length).toBeGreaterThan(0)
    expect(screen.getByText("Confused")).toBeVisible()
    expect(screen.getByText("Concerned")).toBeVisible()
    expect(screen.getByText("Collaborative")).toBeVisible()
    expect(screen.queryByText("Angry")).toBeNull()
    expect(screen.queryByText("Upset")).toBeNull()
  })

  it("keeps the summary aligned with the highest-probability category", async () => {
    render(
      <ReactionForecast
        riskLevel="medium"
        forecast={{
          collaborative: 12,
          concerned: 18,
          defensive: 30,
          hostile: 25,
          confused: 15,
        }}
      />,
    )

    expect(screen.getByText("Most Likely Reaction")).toBeVisible()
    expect(screen.getByText("Defensive")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: /Show probability bars/i }))

    await waitFor(() => {
      expect(screen.getByText("30%")).toBeVisible()
    })

    const bars = screen.getAllByText(/%$/).map((node) => node.textContent)
    expect(bars[0]).toBe("30%")
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
