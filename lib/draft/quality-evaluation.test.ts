import { describe, expect, it } from "vitest"
import {
  evaluateDraftQuality,
  isOutputWorseThanSource,
} from "@/lib/draft/quality-evaluation"
import { calibrateLengthTarget } from "@/lib/draft/length-calibration"

describe("evaluateDraftQuality", () => {
  const lucySource = [
    "Dear Lucy's Dad,",
    "",
    "I understand that Lucy may feel more comfortable having her phone with her, but classroom rules are clear that phones are not used during lessons.",
    "",
    "I can't make individual exceptions in the moment, as this would quickly become unmanageable across the class. I need to apply the same expectations consistently for all students.",
    "",
    "I will continue to support Lucy in class, but these expectations will remain in place.",
    "",
    "Regards,",
    "Greg",
  ].join("\n")

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

  it("fails the bad Lucy collaborative rewrite with blocking violations", () => {
    const badCandidate = [
      "Dear Parent/Carer,",
      "",
      "I understand your concerns about Lucy's needs in class. While I maintain consistent expectations for all students to ensure fairness, I'm committed to supporting Lucy within this framework.",
      "",
      "I'd be happy to discuss how we can best help Lucy meet these expectations while ensuring she feels supported in her learning.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    const result = evaluateDraftQuality({
      sourceText: lucySource,
      candidateText: badCandidate,
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "FABRICATION", severity: "blocking" }),
        expect.objectContaining({ category: "INTENT_DRIFT", severity: "blocking" }),
        expect.objectContaining({ category: "BOUNDARY_DILUTION", severity: "blocking" }),
        expect.objectContaining({ category: "TOPIC_OMISSION", severity: "blocking" }),
      ]),
    )
  })

  it("fails a live-style Lucy rewrite that adds an available-to-discuss invitation", () => {
    const liveStyleCandidate = [
      "Dear Parent/Carer,",
      "",
      "I am writing about Lucy's phone use during lessons. Our classroom policy is that phones are not used during class time, and I apply this expectation to all students.",
      "",
      "I will continue to support Lucy in her learning, and the phone policy will remain in place. I am available to discuss any concerns you may have about how Lucy is settling into class routines.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    const result = evaluateDraftQuality({
      sourceText: lucySource,
      candidateText: liveStyleCandidate,
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.verdict).toBe("needs_rewrite")
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "FABRICATION", severity: "blocking" }),
        expect.objectContaining({ category: "INTENT_DRIFT", severity: "blocking" }),
      ]),
    )
  })

  it("passes a good Lucy phone-boundary rewrite", () => {
    const goodCandidate = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I understand that Lucy may feel more comfortable having her phone with her, and I will continue to support her sensitively in class.",
      "",
      "The classroom expectation is that phones are not used during lessons. I apply this consistently so that expectations remain clear and fair for all students.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    const result = evaluateDraftQuality({
      sourceText: lucySource,
      candidateText: goodCandidate,
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.violations.filter((violation) => violation.severity === "blocking")).toEqual([])
    expect(["already_strong", "improved"]).toContain(result.verdict)
  })

  it("flags boundary dilution when a firm source statement is removed entirely", () => {
    const result = evaluateDraftQuality({
      sourceText: "These expectations will remain in place.",
      candidateText: "I am committed to supporting Lucy within this framework and working with her calmly in class.",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "BOUNDARY_DILUTION",
          severity: "blocking",
          phrase: "firm boundary removed from output",
        }),
      ]),
    )
  })

  it("flags topic omission for phone-device drafts", () => {
    const result = evaluateDraftQuality({
      sourceText: lucySource,
      candidateText:
        "Dear Parent/Carer,\n\nThank you for getting in touch. I will continue to support Lucy sensitively in class and keep expectations fair for all students.\n\nKind regards,\nGreg",
      language: "en",
      teacherDraftMode: true,
    })

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "TOPIC_OMISSION",
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
