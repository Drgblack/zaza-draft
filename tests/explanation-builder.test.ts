import { describe, expect, it } from "vitest"

import { buildExplanationLines, type ExplanationSignal } from "@/src/lib/safetyEngine/explanationBuilder"

function createSignal(overrides: Partial<ExplanationSignal> & Pick<ExplanationSignal, "id" | "category" | "label">): ExplanationSignal {
  return {
    id: overrides.id,
    category: overrides.category,
    label: overrides.label,
    matchedPhrase: overrides.matchedPhrase,
    weight: overrides.weight,
    adjustedWeight: overrides.adjustedWeight,
  }
}

describe("buildExplanationLines", () => {
  it("returns only four lines and prioritises the highest-weight non-mitigating signals", () => {
    const lines = buildExplanationLines(
      [
        createSignal({
          id: "low_cold",
          category: "emotional_coldness",
          label: "No greeting",
          adjustedWeight: 3,
        }),
        createSignal({
          id: "high_acc",
          category: "accusation",
          label: "Direct accusation",
          adjustedWeight: 12.5,
        }),
        createSignal({
          id: "mid_escalation",
          category: "escalation",
          label: "Administrative escalation",
          adjustedWeight: 9,
        }),
        createSignal({
          id: "mid_demand",
          category: "prescriptive_demand",
          label: "Prescriptive demand",
          adjustedWeight: 8,
        }),
        createSignal({
          id: "mid_negative",
          category: "negative_generalisation",
          label: "Global failure framing",
          adjustedWeight: 7,
        }),
        createSignal({
          id: "low_frustration",
          category: "frustration",
          label: "Teacher exhaustion",
          adjustedWeight: 6,
        }),
      ],
      false,
    )

    expect(lines).toEqual([
      "Direct accusation detected — replaced with observation-based phrasing",
      "Administrative escalation detected — softened to a collaborative next step",
      "Prescriptive demand detected — replaced with a collaborative invitation",
      "Global failure framing detected — replaced with a specific, time-bounded observation",
    ])
  })

  it("includes the structural imbalance line when present", () => {
    const lines = buildExplanationLines(
      [
        createSignal({
          id: "acc_1",
          category: "accusation",
          label: "Direct accusation",
          adjustedWeight: 10,
        }),
      ],
      true,
    )

    expect(lines).toContain("Message contains only negative observations — no positive context found")
  })

  it("does not include mitigating signals in the output", () => {
    const lines = buildExplanationLines(
      [
        createSignal({
          id: "mit_1",
          category: "mitigating",
          label: "Collaborative opener",
          adjustedWeight: -7.5,
        }),
        createSignal({
          id: "acc_1",
          category: "accusation",
          label: "Direct accusation",
          adjustedWeight: 10,
        }),
      ],
      false,
    )

    expect(lines).toEqual([
      "Direct accusation detected — replaced with observation-based phrasing",
    ])
  })

  it("builds the correct line for a single accusation signal", () => {
    const lines = buildExplanationLines(
      [
        createSignal({
          id: "acc_1",
          category: "accusation",
          label: "Direct accusation",
          adjustedWeight: 10,
        }),
      ],
      false,
    )

    expect(lines).toEqual([
      "Direct accusation detected — replaced with observation-based phrasing",
    ])
  })
})
