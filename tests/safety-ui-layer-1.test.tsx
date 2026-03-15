import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SafetyBadge } from "@/src/components/SafetyBadge"
import { TriggerList } from "@/src/components/TriggerList"
import type { Signal } from "@/src/lib/safetyEngine/signalDetector"

type TriggerSignal = Signal & {
  matchedPhrase?: string
}

function createSignal(overrides: Partial<TriggerSignal> & Pick<Signal, "id" | "category" | "label">): TriggerSignal {
  return {
    id: overrides.id,
    category: overrides.category,
    label: overrides.label,
    weight: overrides.weight ?? 0,
    patterns: overrides.patterns ?? [],
    matchMode: overrides.matchMode ?? "any",
    proximityBoost: overrides.proximityBoost ?? false,
    detectionNote: overrides.detectionNote ?? "test signal",
    requiresCoContext: overrides.requiresCoContext,
    matchedPhrase: overrides.matchedPhrase,
  }
}

describe("SafetyBadge", () => {
  it("renders the low-risk badge copy", () => {
    render(<SafetyBadge riskLevel="low" />)

    expect(screen.getByText("Communication risk: Low")).toBeInTheDocument()
  })

  it("renders nothing when no risk level is provided", () => {
    const { container } = render(<SafetyBadge />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe("TriggerList", () => {
  it("renders nothing for low risk", () => {
    const { container } = render(<TriggerList triggeredSignals={[]} riskLevel="low" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders a collapsed expandable list for medium risk", () => {
    render(
      <TriggerList
        riskLevel="medium"
        triggeredSignals={[
          createSignal({
            id: "acc_1",
            category: "accusation",
            label: "Direct accusation",
            matchedPhrase: "your child refuses",
          }),
          createSignal({
            id: "cold_1",
            category: "emotional_coldness",
            label: "No collaboration invitation",
          }),
        ]}
      />,
    )

    expect(screen.getByRole("button", { name: "2 potential triggers detected ▾" })).toBeInTheDocument()
    expect(screen.queryByText('Direct accusation ("your child refuses")')).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "2 potential triggers detected ▾" }))

    expect(screen.getByText('Direct accusation ("your child refuses")')).toBeVisible()
    expect(screen.getByText("No collaboration invitation")).toBeVisible()
  })

  it("renders expanded immediately for high risk", () => {
    render(
      <TriggerList
        riskLevel="high"
        triggeredSignals={[
          createSignal({
            id: "acc_1",
            category: "accusation",
            label: "Direct accusation",
            matchedPhrase: "your child refuses",
          }),
        ]}
      />,
    )

    expect(screen.getByText("Triggers detected:")).toBeInTheDocument()
    expect(screen.getByText('Direct accusation ("your child refuses")')).toBeVisible()
    expect(screen.queryByRole("button", { name: /potential triggers detected/i })).toBeNull()
  })
})
