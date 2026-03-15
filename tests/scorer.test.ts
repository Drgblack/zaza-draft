import { describe, expect, it } from "vitest"

import { scoreSafetySignals } from "@/src/lib/safetyEngine/scorer"
import type { FiredSignal, Signal } from "@/src/lib/safetyEngine/signalDetector"

function createSignal(overrides: Partial<FiredSignal> & Pick<Signal, "id" | "category">): FiredSignal {
  return {
    id: overrides.id,
    category: overrides.category,
    label: overrides.label ?? overrides.id,
    weight: overrides.weight ?? 0,
    patterns: overrides.patterns ?? [],
    matchMode: overrides.matchMode ?? "any",
    proximityBoost: overrides.proximityBoost ?? false,
    detectionNote: overrides.detectionNote ?? "test signal",
    requiresCoContext: overrides.requiresCoContext,
    adjustedWeight: overrides.adjustedWeight ?? 0,
  }
}

describe("scoreSafetySignals", () => {
  it("returns high for a capped multi-category high-scoring input", () => {
    const result = scoreSafetySignals(
      [
        createSignal({ id: "acc_1", category: "accusation", adjustedWeight: 18 }),
        createSignal({ id: "acc_2", category: "accusation", adjustedWeight: 18 }),
        createSignal({ id: "esc_1", category: "escalation", adjustedWeight: 20 }),
        createSignal({ id: "fru_1", category: "frustration", adjustedWeight: 8 }),
      ],
      "medium",
      false,
      0,
    )

    expect(result).toEqual({
      riskScore: 69.6,
      riskLevel: "high",
    })
  })

  it("returns low for a mitigating-heavy input", () => {
    const result = scoreSafetySignals(
      [
        createSignal({ id: "mit_1", category: "mitigating", adjustedWeight: -12 }),
        createSignal({ id: "mit_2", category: "mitigating", adjustedWeight: -10 }),
      ],
      "low",
      false,
      0,
    )

    expect(result).toEqual({
      riskScore: 0,
      riskLevel: "low",
    })
  })

  it("caps a single-category high score at medium by the minimum signal count rule", () => {
    const result = scoreSafetySignals(
      [
        createSignal({ id: "acc_1", category: "accusation", adjustedWeight: 20 }),
        createSignal({ id: "acc_2", category: "accusation", adjustedWeight: 20 }),
      ],
      "high",
      true,
      0,
    )

    expect(result).toEqual({
      riskScore: 60,
      riskLevel: "medium",
    })
  })
})
