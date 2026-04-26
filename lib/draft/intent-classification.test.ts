import { describe, expect, it } from "vitest"
import {
  checkIntentPreservation,
  classifyTeacherIntent,
} from "@/lib/draft/intent-classification"

describe("teacher draft intent classification", () => {
  it("classifies limit intent with high confidence", () => {
    const result = classifyTeacherIntent(
      "Phones will not be used during lessons. I apply this consistently for all students.",
    )

    expect(result.intent).toBe("limit")
    expect(result.confidence).toBe("high")
  })

  it("classifies close intent with high confidence", () => {
    const result = classifyTeacherIntent(
      "I wanted to keep you informed. No further action is needed at this stage.",
    )

    expect(result.intent).toBe("close")
    expect(result.confidence).toBe("high")
  })

  it("classifies invite intent with high confidence", () => {
    const result = classifyTeacherIntent(
      "I'd be happy to chat further if that would help. Please let me know.",
    )

    expect(result.intent).toBe("invite")
    expect(result.confidence).toBe("high")
  })

  it("detects intent drift from limit to invite", () => {
    const sourceText =
      "Phones will not be used during lessons. This applies to all students."
    const candidateText =
      "I understand the concern, but please get in touch if you'd like to discuss this further."

    const result = checkIntentPreservation({
      sourceIntent: classifyTeacherIntent(sourceText),
      candidateIntent: classifyTeacherIntent(candidateText),
      sourceText,
      candidateText,
    })

    expect(result.preserved).toBe(false)
    expect(result.violation).toEqual({
      type: "INTENT_DRIFT",
      sourceIntent: "limit",
      candidateIntent: "invite",
      description: "Source sets a limit but output opens dialogue about it",
    })
  })

  it("detects intent drift from close to invite", () => {
    const sourceText = "I wanted to keep you informed. No reply needed."
    const candidateText =
      "I wanted to keep you informed. Please don't hesitate to reach out."

    const result = checkIntentPreservation({
      sourceIntent: classifyTeacherIntent(sourceText),
      candidateIntent: classifyTeacherIntent(candidateText),
      sourceText,
      candidateText,
    })

    expect(result.preserved).toBe(false)
    expect(result.violation).toEqual({
      type: "INTENT_DRIFT",
      sourceIntent: "close",
      candidateIntent: "invite",
      description: "Source closes the thread but output invites further contact",
    })
  })

  it("treats limit-to-limit as preserved", () => {
    const sourceText =
      "Phones will not be used during lessons. This applies to all students."
    const candidateText =
      "The classroom expectation is that phones are not used during lessons. I apply this consistently."

    const result = checkIntentPreservation({
      sourceIntent: classifyTeacherIntent(sourceText),
      candidateIntent: classifyTeacherIntent(candidateText),
      sourceText,
      candidateText,
    })

    expect(result.preserved).toBe(true)
    expect(result.violation).toBeNull()
  })
})
