import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SafetyBadge } from "@/src/components/SafetyBadge"
import { TriggerList } from "@/src/components/TriggerList"
import type { ProfessionalRiskFlag } from "@/src/lib/safetyEngine/professionalRiskDetector"
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
  it("renders the unified ready-to-send badge copy", () => {
    render(<SafetyBadge status="READY_TO_SEND" />)

    expect(screen.getByText("Ready to send")).toBeInTheDocument()
  })

  it("renders clearer review guidance for medium-risk drafts", () => {
    render(<SafetyBadge status="REVIEW_ONCE_MORE" />)

    expect(screen.getByText("Review once before sending")).toBeInTheDocument()
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

  it("renders a collapsed expandable list for medium risk", async () => {
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

    expect(screen.getByRole("button", { name: "2 language risks detected" })).toBeInTheDocument()
    expect(screen.queryByText("Judgement wording")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "2 language risks detected" }))

    await waitFor(() => {
      expect(screen.getByText("Judgement wording")).toBeVisible()
    })
    expect(screen.getByText("Missing collaboration invitation")).toBeVisible()
    expect(
      screen.getByText('Example from draft: "your child refuses" • Why Draft flagged this: Direct accusation'),
    ).toBeVisible()
    expect(screen.queryByText(/Detected:/)).toBeNull()
    expect(screen.queryByText(/Signal:/)).toBeNull()
  })

  it("keeps high-risk panels collapsed by default and includes professional-risk labels", async () => {
    const professionalRiskFlags: ProfessionalRiskFlag[] = [
      {
        signalId: "pro_medical_speculation",
        label: "Medical or diagnostic speculation",
        matchedPhrase: "ADHD",
      },
    ]

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
        professionalRiskFlags={professionalRiskFlags}
      />,
    )

    expect(screen.getByRole("button", { name: "2 language risks detected" })).toBeInTheDocument()
    expect(screen.queryByText("Medical or diagnostic speculation")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "2 language risks detected" }))

    await waitFor(() => {
      expect(screen.getByText("Judgement wording")).toBeVisible()
    })
    expect(screen.getByText("Medical or diagnostic speculation")).toBeVisible()
    expect(screen.getByText('Example from draft: "ADHD"')).toBeVisible()
  })
})
