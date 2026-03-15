import { beforeEach, describe, expect, it, vi } from "vitest"

const mockClassifyTone = vi.fn()

vi.mock("@/src/lib/safetyEngine/toneClassifier", () => ({
  classifyTone: (...args: unknown[]) => mockClassifyTone(...args),
}))

import { runSafetyEngine } from "@/src/lib/safetyEngine"

function getTopReactionKey(reactionForecast: Record<string, number>) {
  return Object.entries(reactionForecast).sort((left, right) => right[1] - left[1])[0]?.[0]
}

describe("runSafetyEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns high risk and a defensive top reaction for the high_01 fixture", async () => {
    mockClassifyTone.mockResolvedValue({
      toneClass: "accusatory",
      toneModifier: 30,
    })

    const result = await runSafetyEngine({
      rawMessage:
        "Your child refuses to listen and constantly disrupts the class. I've told you this before.",
      messageDirection: "teacher_to_parent",
      inputMode: "safe_draft",
    })

    expect(result?.riskLevel).toBe("high")
    expect(getTopReactionKey(result?.reactionForecast ?? {})).toBe("defensive")
  })

  it("returns low risk and a collaborative top reaction for the low_01 fixture", async () => {
    mockClassifyTone.mockResolvedValue({
      toneClass: "collaborative",
      toneModifier: -20,
    })

    const result = await runSafetyEngine({
      rawMessage:
        "I wanted to reach out about Jamie. During today's maths lesson I noticed he was finding concentration challenging. I've spoken with him about some strategies. Would you be open to a quick call this week?",
      messageDirection: "teacher_to_parent",
      inputMode: "safe_draft",
    })

    expect(result?.riskLevel).toBe("low")
    expect(getTopReactionKey(result?.reactionForecast ?? {})).toBe("collaborative")
  })

  it("sets documentation mode available for the documentation_01 fixture", async () => {
    mockClassifyTone.mockResolvedValue({
      toneClass: "clinical",
      toneModifier: 5,
    })

    const result = await runSafetyEngine({
      rawMessage: "He hit another student at lunch and I'm at a loss. You need to talk to him.",
      messageDirection: "teacher_to_parent",
      inputMode: "safe_draft",
    })

    expect(result?.documentationModeAvailable).toBe(true)
  })

  it("returns null for non-parent directions", async () => {
    const result = await runSafetyEngine({
      rawMessage: "I need to document this behaviour concern for SLT review today.",
      messageDirection: "teacher_to_admin",
      inputMode: "safe_draft",
    })

    expect(result).toBeNull()
    expect(mockClassifyTone).not.toHaveBeenCalled()
  })
})
