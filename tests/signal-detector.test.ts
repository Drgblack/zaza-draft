import { describe, expect, it } from "vitest"

import { detectSignals } from "@/src/lib/safetyEngine/signalDetector"

const fixtures = [
  {
    id: "high_01",
    input: "Your child refuses to listen and constantly disrupts the class. I've told you this before.",
    expectedSignals: [
      "acc_your_child_negative",
      "acc_refusal_language",
      "acc_absolute_negative",
      "cold_no_greeting",
      "cold_no_collaboration",
    ],
    expectedAdjustedWeights: {
      acc_your_child_negative: 12.5,
      acc_refusal_language: 9,
      acc_absolute_negative: 9,
      cold_no_greeting: 3,
      cold_no_collaboration: 4,
    },
  },
  {
    id: "medium_01",
    input: "There is a problem with homework completion this week. Please make sure he does it.",
    expectedSignals: ["cold_no_greeting", "cold_no_collaboration"],
    expectedAdjustedWeights: {
      cold_no_greeting: 3,
      cold_no_collaboration: 4,
    },
  },
  {
    id: "low_01",
    input:
      "I wanted to reach out about Jamie. During today's maths lesson I noticed he was finding concentration challenging. I've spoken with him about some strategies. Would you be open to a quick call this week?",
    expectedSignals: [
      "cold_no_greeting",
      "mit_collaborative_opener",
      "mit_solution_framing",
    ],
    expectedAdjustedWeights: {
      cold_no_greeting: 3,
      mit_collaborative_opener: -7.5,
      mit_solution_framing: -5,
    },
  },
] as const

describe("detectSignals", () => {
  it.each(fixtures)("detects expected signals for $id", ({ input, expectedSignals, expectedAdjustedWeights }) => {
    const firedSignals = detectSignals(input)
    const firedIds = firedSignals.map((signal) => signal.id).sort()

    expect(firedIds).toEqual([...expectedSignals].sort())

    for (const [signalId, adjustedWeight] of Object.entries(expectedAdjustedWeights)) {
      expect(firedSignals.find((signal) => signal.id === signalId)?.adjustedWeight).toBe(adjustedWeight)
    }
  })

  it("matches patterns case-insensitively", () => {
    const firedIds = detectSignals(fixtures[0].input.toUpperCase())
      .map((signal) => signal.id)
      .sort()

    expect(firedIds).toEqual([...fixtures[0].expectedSignals].sort())
  })
})
