import { describe, expect, it } from "vitest"
import { detectHighEmotionPhrases } from "@/lib/deescalation/detect"
import { rewriteHighEmotionText } from "@/lib/deescalation/rewrite"
import { buildVariantRegexes } from "../../../../../tests/utils/variant-guard"

describe("API route de-escalation summary", () => {
  it("marks high-emotion input as de-escalated and keeps output professional", () => {
    const input = "I'm sick of Johnny's lies and lazy attitude."
    const detection = detectHighEmotionPhrases(input)
    const { cleanedText, summary } = rewriteHighEmotionText(input, detection)

    expect(summary.wasDeescalated).toBe(true)
    expect(cleanedText.toLowerCase()).not.toMatch(/lies|lazy/)
    expect(cleanedText).toMatch(/concerned/)
    expect(summary.flaggedPhrases.every((phrase) => phrase.suggestionSnippet.length > 0)).toBe(true)
    expect(summary.coachingLine).toContain("softened")
  })

  it("returns no summary details when the note is already calm", () => {
    const input = "Please remind Johnny to bring his book."
    const detection = detectHighEmotionPhrases(input)
    const { cleanedText, summary } = rewriteHighEmotionText(input, detection)

    expect(summary.wasDeescalated).toBe(false)
    expect(cleanedText).toBe(input)
    expect(summary.flaggedPhrases).toHaveLength(0)
    expect(summary.coachingLine).toContain("calm and professional")
  })

  it("never echoes the flagged lexicon in cleaned notes", () => {
    const input = "I am sick of Johnny's lies, lazy behaviour, and damn excuses."
    const detection = detectHighEmotionPhrases(input)
    expect(detection.flaggedPhrases.length).toBeGreaterThanOrEqual(3)

    const { cleanedText } = rewriteHighEmotionText(input, detection)
    const cleanedLower = cleanedText.toLowerCase()
    detection.flaggedPhrases.forEach((phrase) => {
      expect(cleanedLower).not.toContain(phrase.snippet.toLowerCase())
    })
  })

  it("never leaks high-risk variants in the final draft text", () => {
    const input = "I'm sick of Johnny's lies and lazy, damn excuses."
    const detection = detectHighEmotionPhrases(input)
    const { cleanedText } = rewriteHighEmotionText(input, detection)
    const variantRegexes = buildVariantRegexes(["lie", "lazy", "damn"])

    for (const regex of variantRegexes) {
      expect(regex.test(cleanedText)).toBe(false)
    }
  })

  it("handles german notes with flagged language", () => {
    const input = "Wenn du nicht besser arbeitest, ist das verdammt nervig."
    const detection = detectHighEmotionPhrases(input)
    const { cleanedText, summary } = rewriteHighEmotionText(input, detection)

    expect(summary.wasDeescalated).toBe(true)
    expect(cleanedText.toLowerCase()).not.toContain("verdammt")
    expect(summary.flaggedPhrases.length).toBeGreaterThan(0)
    expect(summary.coachingLine).toContain("softened")
  })
})
