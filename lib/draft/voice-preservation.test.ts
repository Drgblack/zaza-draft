import { describe, expect, it } from "vitest"
import {
  checkVoicePreservation,
  extractVoiceProfile,
} from "@/lib/draft/voice-preservation"

describe("voice preservation", () => {
  it("detects sentence length drift", () => {
    const sourceProfile = extractVoiceProfile(
      "I understand your concern. I will speak with Lucy tomorrow. The rule remains the same.",
    )
    const candidateProfile = extractVoiceProfile(
      "I understand your concern and, having considered the broader classroom context, I will speak with Lucy tomorrow in a calm and measured way. The rule remains the same and, in order to ensure consistency across the class, it will continue to be applied carefully. I also want to explain the wider context so the expectation is fully understood by everyone involved.",
    )

    const result = checkVoicePreservation({ sourceProfile, candidateProfile })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "SENTENCE_LENGTH_DRIFT" }),
      ]),
    )
  })

  it("detects upward formality drift", () => {
    const sourceProfile = extractVoiceProfile(
      "Thanks for getting in touch. I wanted to let you know what happened today.",
    )
    const candidateProfile = extractVoiceProfile(
      "I wish to draw your attention to the matter discussed today. Please note that I am writing to clarify the position.",
    )

    const result = checkVoicePreservation({ sourceProfile, candidateProfile })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "FORMALITY_DRIFT" }),
      ]),
    )
  })

  it("detects person drift", () => {
    const sourceProfile = extractVoiceProfile(
      "I understand your concern. I will speak with him tomorrow. I have already addressed it in class.",
    )
    const candidateProfile = extractVoiceProfile(
      "The concern has been noted. The matter will be addressed tomorrow. It has already been raised in class.",
    )

    const result = checkVoicePreservation({ sourceProfile, candidateProfile })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "PERSON_DRIFT" }),
      ]),
    )
  })

  it("treats matched register as preserved", () => {
    const sourceProfile = extractVoiceProfile(
      "Thank you for getting in touch. I understand your concern, and I will address it calmly in class. I will keep the expectation clear for everyone.",
    )
    const candidateProfile = extractVoiceProfile(
      "Thank you for getting in touch. I understand your concern, and I will address it calmly tomorrow. I will keep the expectation clear for everyone.",
    )

    const result = checkVoicePreservation({ sourceProfile, candidateProfile })

    expect(result.preserved).toBe(true)
    expect(result.violations).toEqual([])
  })

  it("does not trigger sentence length drift for a one-sentence source", () => {
    const sourceProfile = extractVoiceProfile("I will follow this up tomorrow.")
    const candidateProfile = extractVoiceProfile(
      "I will follow this up tomorrow and, after reviewing the wider context carefully, provide a fuller update as needed.",
    )

    const result = checkVoicePreservation({ sourceProfile, candidateProfile })

    expect(result.violations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "SENTENCE_LENGTH_DRIFT" })]),
    )
  })
})
