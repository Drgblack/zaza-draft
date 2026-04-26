import { describe, expect, it } from "vitest"
import { calibrateLengthTarget } from "@/lib/draft/length-calibration"
import { evaluateDraftQuality } from "@/lib/draft/quality-evaluation"

describe("length calibration", () => {
  it("assigns minimal band for a short source", () => {
    const result = calibrateLengthTarget({
      sourceWordCount: 35,
      sourceSentenceCount: 3,
      intent: "limit",
      hasMultipleIssues: false,
    })

    expect(result.band).toBe("minimal")
    expect(result.maxWords).toBeLessThanOrEqual(46)
  })

  it("assigns extended band for a multi-issue source", () => {
    const result = calibrateLengthTarget({
      sourceWordCount: 90,
      sourceSentenceCount: 6,
      intent: "inform",
      hasMultipleIssues: true,
    })

    expect(result.band).toBe("extended")
  })

  it("uses standard band by default", () => {
    const result = calibrateLengthTarget({
      sourceWordCount: 55,
      sourceSentenceCount: 4,
      intent: "inform",
      hasMultipleIssues: false,
    })

    expect(result.band).toBe("standard")
  })

  it("fires LENGTH_EXCEEDED in quality evaluation", () => {
    const lengthTarget = calibrateLengthTarget({
      sourceWordCount: 30,
      sourceSentenceCount: 3,
      intent: "limit",
      hasMultipleIssues: false,
    })
    const sourceText =
      "Thank you for your message. Phones stay away during lessons. I will keep that expectation clear."
    const candidateText =
      "Thank you for your message. Phones stay away during lessons. I will keep that expectation clear and consistent for everyone in class. I also wanted to add some further context so the routines feel settled and the expectations remain predictable for all students."

    const result = evaluateDraftQuality({
      sourceText,
      candidateText,
      language: "en",
      teacherDraftMode: true,
      lengthTarget,
    })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "LENGTH_EXCEEDED",
          severity: "advisory",
        }),
      ]),
    )
  })

  it("always assigns extended band for escalate intent", () => {
    const result = calibrateLengthTarget({
      sourceWordCount: 25,
      sourceSentenceCount: 2,
      intent: "escalate",
      hasMultipleIssues: false,
    })

    expect(result.band).toBe("extended")
  })
})
