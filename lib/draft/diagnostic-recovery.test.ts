import { describe, expect, it } from "vitest"

import { buildObservationOnlyRecoveryInput } from "@/lib/draft/diagnostic-recovery"

describe("buildObservationOnlyRecoveryInput", () => {
  it("keeps observation detail after a diagnostic speculation clause", () => {
    const result = buildObservationOnlyRecoveryInput(
      "I wonder if he might be on the autism spectrum because he struggles to join in during group work and becomes unsettled when routines change.",
    )

    expect(result.observationText).toBe(
      "He struggles to join in during group work and becomes unsettled when routines change.",
    )
    expect(result.generationPrompt).not.toContain("autism")
  })

  it("falls back to a safe observation example when only the diagnostic label is provided", () => {
    const result = buildObservationOnlyRecoveryInput("I think he may have ADHD")

    expect(result.observationText).toBe(
      "He sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions.",
    )
    expect(result.generationPrompt).not.toContain("ADHD")
  })
})
