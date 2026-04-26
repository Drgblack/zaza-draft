import { describe, expect, it } from "vitest"
import {
  applyRegisterCorrections,
  detectRegisterViolations,
  normaliseSpelling,
} from "@/lib/draft/register-accuracy"

describe("register accuracy", () => {
  it("detects and corrects an American corporate phrase", () => {
    const text = "Please don't hesitate to reach out if you have any concerns."
    const violations = detectRegisterViolations(text)
    const result = applyRegisterCorrections(text)

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "reach out",
          phrase: "reach out",
          replacement: "get in touch",
        }),
      ]),
    )
    expect(result.corrected).toBe("Please don't hesitate to get in touch if you have any concerns.")
  })

  it("normalises English spelling for UK and Australian output", () => {
    const text = "I want to make sure his behavior in class is recognized."

    expect(normaliseSpelling(text, "en-GB")).toBe(
      "I want to make sure his behaviour in class is recognised.",
    )
  })

  it("detects and corrects multiple violations in one draft", () => {
    const text =
      "Moving forward, we will utilize the action items from today's discussion."
    const violations = detectRegisterViolations(text)
    const result = applyRegisterCorrections(text)

    expect(violations).toHaveLength(3)
    expect(result.corrected).toBe("we will use the next steps from today's discussion.")
  })

  it("passes a clean UK draft without changes", () => {
    const text =
      "Thank you for getting in touch. I will continue to handle this calmly in class and keep the expectations clear for everyone."

    expect(detectRegisterViolations(text)).toEqual([])
    expect(applyRegisterCorrections(text)).toEqual({
      corrected: text,
      corrections: [],
    })
  })

  it("flags per my last without auto-correcting it", () => {
    const text = "Per my last email, the expectation remains the same."
    const violations = detectRegisterViolations(text)
    const result = applyRegisterCorrections(text)

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "per my last",
          replacement: null,
        }),
      ]),
    )
    expect(result.corrected).toBe(text)
  })
})
