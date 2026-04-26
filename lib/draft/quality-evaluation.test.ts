import { describe, expect, it } from "vitest"
import {
  evaluateDraftQuality,
  isOutputWorseThanSource,
} from "@/lib/draft/quality-evaluation"
import { calibrateLengthTarget } from "@/lib/draft/length-calibration"

describe("evaluateDraftQuality", () => {
  it("returns already_strong for a warm professional draft with no violations", () => {
    const source = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I'm sorry to hear that Lucy felt uncomfortable in the lesson.",
      "",
      "The expectation is that phones are not used during lessons, and I will continue to handle this calmly in class.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    const result = evaluateDraftQuality({
      sourceText: source,
      candidateText: source,
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("already_strong")
    expect(result.violations).toEqual([])
  })

  it("detects boundary dilution as needs_rewrite", () => {
    const result = evaluateDraftQuality({
      sourceText: "Phones are not permitted during lessons.",
      candidateText: "We will consider whether phones might be permitted in certain lessons going forward.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "BOUNDARY_DILUTION",
          severity: "blocking",
        }),
      ]),
    )
  })

  it("detects over-softening as needs_rewrite", () => {
    const result = evaluateDraftQuality({
      sourceText: "I cannot make individual exceptions.",
      candidateText: "I will try to keep exceptions to a minimum where possible.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "OVER_SOFTENING",
          severity: "blocking",
        }),
      ]),
    )
  })

  it("adds inconsistent framing as an advisory when firm and hedged language appear together", () => {
    const result = evaluateDraftQuality({
      sourceText: "Phones are not permitted during lessons.",
      candidateText:
        "Phones are not permitted during lessons, although I will try to be flexible where possible.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "INCONSISTENT_FRAMING",
          severity: "advisory",
        }),
      ]),
    )
  })

  it("adds LENGTH_EXCEEDED as an advisory when output exceeds the calibrated target", () => {
    const lengthTarget = calibrateLengthTarget({
      sourceWordCount: 30,
      sourceSentenceCount: 3,
      intent: "limit",
      hasMultipleIssues: false,
    })
    const result = evaluateDraftQuality({
      sourceText:
        "Thank you for your message. Phones stay away during lessons. I will keep that expectation clear.",
      candidateText:
        "Thank you for your message. Phones stay away during lessons. I will keep that expectation clear and consistent for everyone in class. I also wanted to add some further detail because that can help the routines feel more settled across the week.",
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

  it("treats message expansion alone as improved", () => {
    const sourceText =
      "Thank you for your message about homework expectations. I want the task to remain clear and manageable for everyone in class. I will address this calmly in lessons and keep the expectation consistent for all students."
    const candidateText =
      "Thank you for your message about homework expectations. I want the task to remain clear and manageable for everyone in class. I will address this calmly in lessons and keep the expectation consistent for all students. I also wanted to add some further detail about how I approach this across the week so that the expectations stay predictable and the routines feel steady for the class."

    const result = evaluateDraftQuality({
      sourceText,
      candidateText,
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("improved")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "MESSAGE_EXPANSION",
          severity: "advisory",
        }),
      ]),
    )
  })

  it("treats three advisories as needs_rewrite", () => {
    const sourceText =
      "Thank you for your message about homework expectations. I want the task to remain clear and manageable for everyone in class. I will address this calmly in lessons and keep the expectation consistent for all students."
    const candidateText =
      "Thank you for your message about homework expectations. I want the task to remain clear and manageable for everyone in class. I will address this calmly in lessons and keep the expectation consistent for all students. I also wanted to add some further detail because I want the expectations to stay predictable for the class. I am including this because the routines may feel steadier for the class, and working together can help keep the message clear."

    const result = evaluateDraftQuality({
      sourceText,
      candidateText,
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "MESSAGE_EXPANSION" }),
        expect.objectContaining({ category: "GENERIC_REASSURANCE_FILLER" }),
        expect.objectContaining({ category: "OVER_EXPLANATION" }),
      ]),
    )
  })

  it("treats fabrication as blocking", () => {
    const result = evaluateDraftQuality({
      sourceText: "The classroom expectation is that phones are not used during lessons.",
      candidateText:
        "Following our recent conversation, the classroom expectation is that phones are not used during lessons.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "FABRICATION",
          severity: "blocking",
        }),
      ]),
    )
  })

  it("does not flag over-softening when a firm boundary is preserved", () => {
    const result = evaluateDraftQuality({
      sourceText: "Phones will not be used during lessons.",
      candidateText:
        "The classroom expectation is that phones are not used during lessons. I apply this consistently.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.violations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "OVER_SOFTENING" })]),
    )
    expect(["already_strong", "improved"]).toContain(result.verdict)
  })

  it("treats intent drift as blocking when a close message becomes an invitation", () => {
    const result = evaluateDraftQuality({
      sourceText: "I wanted to keep you informed. No further action is needed at this stage.",
      candidateText:
        "I wanted to keep you informed. I'd be happy to discuss this further if that would help.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "INTENT_DRIFT",
          severity: "blocking",
        }),
      ]),
    )
  })

  it("detects when the output is worse than a clean source", () => {
    const sourceText = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I understand your concern, and I will continue to handle this calmly in class.",
      "",
      "The expectation is that phones stay away during lessons, and I will keep that clear and consistent.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")
    const candidateText = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I understand your concern, and I will continue to handle this calmly in class.",
      "",
      "The expectation is that phones stay away during lessons, and I will keep that clear and consistent while working together.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    const sourceQuality = evaluateDraftQuality({
      sourceText,
      candidateText: sourceText,
      language: "en",
      teacherDraftMode: true,
    })
    const candidateQuality = evaluateDraftQuality({
      sourceText,
      candidateText,
      language: "en",
      teacherDraftMode: true,
    })

    expect(
      isOutputWorseThanSource({
        sourceText,
        candidateText,
        sourceViolations: sourceQuality.violations,
        candidateViolations: candidateQuality.violations,
        similarity: candidateQuality.similarity,
        sourceWordCount: sourceQuality.wordCount,
        candidateWordCount: candidateQuality.wordCount,
      }),
    ).toBe(true)
  })

  it("does not treat a longer rewrite as worse when the source has blocking issues", () => {
    const sourceText = "I can't make individual exceptions during lessons."
    const candidateText =
      "I understand the concern, and I will continue to support Lucy calmly in class while keeping the classroom expectations clear and consistent for everyone."

    const sourceQuality = evaluateDraftQuality({
      sourceText,
      candidateText: sourceText,
      language: "en",
      teacherDraftMode: true,
    })
    const candidateQuality = evaluateDraftQuality({
      sourceText,
      candidateText,
      language: "en",
      teacherDraftMode: true,
    })

    expect(
      isOutputWorseThanSource({
        sourceText,
        candidateText,
        sourceViolations: sourceQuality.violations,
        candidateViolations: candidateQuality.violations,
        similarity: candidateQuality.similarity,
        sourceWordCount: sourceQuality.wordCount,
        candidateWordCount: candidateQuality.wordCount,
      }),
    ).toBe(false)
  })

  it("does not treat a genuinely better rewrite as worse", () => {
    const sourceText = "Phones will not be used during lessons, and I can't make individual exceptions."
    const candidateText =
      "The classroom expectation is that phones are not used during lessons. I apply this consistently so that expectations remain clear for all students."

    const sourceQuality = evaluateDraftQuality({
      sourceText,
      candidateText: sourceText,
      language: "en",
      teacherDraftMode: true,
    })
    const candidateQuality = evaluateDraftQuality({
      sourceText,
      candidateText,
      language: "en",
      teacherDraftMode: true,
    })

    expect(
      isOutputWorseThanSource({
        sourceText,
        candidateText,
        sourceViolations: sourceQuality.violations,
        candidateViolations: candidateQuality.violations,
        similarity: candidateQuality.similarity,
        sourceWordCount: sourceQuality.wordCount,
        candidateWordCount: candidateQuality.wordCount,
      }),
    ).toBe(false)
  })
})
