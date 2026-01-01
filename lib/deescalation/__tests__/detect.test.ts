import { describe, expect, it } from "vitest"
import { detectHighEmotionPhrases } from "../detect"
import { rewriteHighEmotionText } from "../rewrite"

describe("de-escalation detection and rewrite", () => {
  it("flags and softens high emotion notes", () => {
    const input = "I'm sick of Johnny's lies and lazy attitude."
    const detection = detectHighEmotionPhrases(input)

    expect(detection.wasDeescalated).toBe(true)
    expect(detection.flaggedPhrases.some((phrase) => phrase.snippet.toLowerCase().includes("lies"))).toBe(true)
    expect(detection.flaggedPhrases.some((phrase) => phrase.snippet.toLowerCase().includes("lazy"))).toBe(true)

    const outcome = rewriteHighEmotionText(input, detection)
    expect(outcome.cleanedText.toLowerCase()).not.toMatch(/lies|lazy/)
    expect(outcome.summary.flaggedPhrases.length).toBeGreaterThan(0)
    expect(outcome.summary.coachingLine).toContain("I kept your intent")
  })

  it("leaves calm notes unchanged", () => {
    const input = "Please remind Johnny to bring his book."
    const detection = detectHighEmotionPhrases(input)

    expect(detection.wasDeescalated).toBe(false)
    expect(detection.flaggedPhrases.length).toBe(0)

    const outcome = rewriteHighEmotionText(input, detection)
    expect(outcome.cleanedText).toBe(input)
    expect(outcome.summary.flaggedPhrases.length).toBe(0)
    expect(outcome.summary.coachingLine).toContain("calm and professional")
  })

  it("does not flag absolutes when paired with time bounds", () => {
    const input = "Johnny never brought his book this week."
    const detection = detectHighEmotionPhrases(input)

    expect(detection.flaggedPhrases.some((phrase) => phrase.category === "absolute")).toBe(false)
    expect(detection.wasDeescalated).toBe(false)
  })

  it("flags absolutes when tied to negative judgements", () => {
    const input = "Johnny never listens and always argues."
    const detection = detectHighEmotionPhrases(input)

    expect(detection.flaggedPhrases.some((phrase) => phrase.category === "absolute")).toBe(true)
  })
})
