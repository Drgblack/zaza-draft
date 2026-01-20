import { describe, expect, it } from "vitest"
import { analyzeVoiceEmotion } from "../emotion"

describe("analyzeVoiceEmotion", () => {
  it("flags strong frustration and anger", () => {
    const result = analyzeVoiceEmotion("I'm so frustrated and angry right now!!!")

    expect(result.frustrationScore).toBeGreaterThan(30)
    expect(result.detectedNegativity).toBe(true)
    expect(["angry", "frustrated"]).toContain(result.primaryEmotion)
  })

  it("keeps calm language low", () => {
    const result = analyzeVoiceEmotion("I'm sharing a quick update about the student.")

    expect(result.frustrationScore).toBeLessThan(25)
    expect(result.urgencyScore).toBeLessThan(10)
    expect(result.primaryEmotion).toBe("neutral")
  })

  it("tallies urgency keywords", () => {
    const result = analyzeVoiceEmotion("This is urgent, please respond ASAP.")
    expect(result.urgencyScore).toBeGreaterThan(10)
  })
})
