import { describe, expect, it } from "vitest"

import {
  classifyParentEmotionalState,
  evaluateProfessionalJudgement,
} from "./professional-judgement"

describe("evaluateProfessionalJudgement", () => {
  it("scores a firm, clear draft highly for clarity", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "Thank you for getting in touch. The classroom expectation is that phones are not used during lessons. I apply this consistently for all students. I will continue to support Lucy in class.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.clarityScore).toBeGreaterThanOrEqual(80)
  })

  it("scores a hedged and open-ended draft poorly for clarity", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "We'll see depending on how things go. It may be possible to review this. Would you like me to check again with you?",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.clarityScore).toBeLessThanOrEqual(40)
  })

  it("scores a firm, teacher-led draft highly for authority", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "I apply this consistently, and I expect phones to stay away during lessons. This is fair to all students.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.authorityScore).toBeGreaterThanOrEqual(80)
  })

  it("scores apology-heavy and permission-seeking language poorly for authority", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "I'm so sorry if this has caused any upset. I just wanted to let you know about it. Is that okay?",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.authorityScore).toBeLessThanOrEqual(40)
  })

  it("produces a high send-confidence score for a clear, low-risk draft", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "Thank you for getting in touch. The classroom expectation is that phones are not used during lessons. I apply this consistently for all students. I will continue to support Lucy in class.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.sendConfidenceScore).toBeGreaterThanOrEqual(80)
  })

  it("produces a low send-confidence score for a vague, apologetic, high-risk draft", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "I'm so sorry if this has caused any upset. We'll see depending on how things go, and it may be possible to review this later. I just wanted to let you know, so please get in touch if you would like to discuss it. Is that okay?",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: {
        riskScore: 70,
        riskLevel: "high",
        triggeredSignals: [],
        toneClass: "clinical",
        topicSensitivity: "low",
        reactionForecast: {
          collaborative: 10,
          concerned: 15,
          defensive: 30,
          hostile: 30,
          confused: 15,
        },
        explanationLines: [],
        documentationModeAvailable: false,
        professionalRiskFlags: [],
        structuralImbalance: false,
      },
    })

    expect(result.sendConfidenceScore).toBeLessThan(60)
  })

  it("flags passive-aggressive phrasing as high parent-interpretation risk", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "As I previously explained, phones are not permitted during lessons and that remains the expectation.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.parentInterpretationRisk).toBe("high")
  })

  it("flags routine stress-emphasis language as medium interpretation risk outside escalation", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "I need to be clear with you that phones are not permitted during lessons.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.parentInterpretationRisk).toBe("medium")
  })

  it("classifies an accusatory parent message and requires de-escalation in the opening", () => {
    const sourceText =
      "Thank you for your email. Why did you tell Lucy she could not use her phone? This was unacceptable and not good enough."
    const result = evaluateProfessionalJudgement({
      sourceText,
      candidateText:
        "The expectation is that phones are not used during lessons. I apply this consistently for all students.",
      sourceIntent: "acknowledge",
      language: "en",
      safetyAnalysis: null,
    })

    expect(classifyParentEmotionalState(sourceText)).toBe("accusatory")
    expect(result.parentEmotionalState).toBe("accusatory")
    expect(result.signals).toContainEqual({
      dimension: "authority",
      finding: "Accusatory parent tone requires explicit de-escalation in opening.",
      direction: "negative",
    })
  })

  it("warns when a distressed parent gets boundary language in the opening paragraph", () => {
    const sourceText =
      "Thank you for your message. Lucy has been in tears and is refusing school because she feels so upset."
    const result = evaluateProfessionalJudgement({
      sourceText,
      candidateText:
        "Phones are not permitted during lessons. I understand this has been upsetting for Lucy, and I will handle it sensitively in class.",
      sourceIntent: "acknowledge",
      language: "en",
      safetyAnalysis: null,
    })

    expect(classifyParentEmotionalState(sourceText)).toBe("distressed")
    expect(result.parentEmotionalState).toBe("distressed")
    expect(result.signals).toContainEqual({
      dimension: "interpretation_risk",
      finding: "Distressed parent - boundary language in opening paragraph may read as dismissive.",
      direction: "negative",
    })
  })

  it("predicts high reply likelihood when a close-intent message adds an open loop", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "I wanted to keep you informed. No reply is needed.",
      candidateText: "I wanted to keep you informed. Please don't hesitate to get in touch.",
      sourceIntent: "close",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.replyLikelihood).toBe("high")
  })

  it("predicts high reply likelihood when a vague follow-up step is introduced", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText: "Phones are not used during lessons. I'll look into this and get back to you.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.replyLikelihood).toBe("high")
  })

  it("keeps reply likelihood low for a clean limit message", () => {
    const result = evaluateProfessionalJudgement({
      sourceText:
        "The classroom expectation is that phones are not used during lessons. I apply this consistently for all students.",
      candidateText:
        "The classroom expectation is that phones are not used during lessons. I apply this consistently so that expectations remain clear and fair for all students.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.replyLikelihood).toBe("low")
  })

  it("scores a firm, consistent limit message as a strong boundary", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones will not be used during lessons.",
      candidateText:
        "Phones will not be used during lessons. I apply this consistently so that expectations are clear and fair for all students.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.boundaryStrengthScore).toBeGreaterThanOrEqual(70)
  })

  it("scores a hedged limit message as a weak boundary", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones will not be used during lessons.",
      candidateText: "I'll try to ensure phones are ideally not used during lessons where possible.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.boundaryStrengthScore).toBeLessThanOrEqual(35)
  })

  it("sets regret risk to high for a poor composite", () => {
    const result = evaluateProfessionalJudgement({
      sourceText: "Phones are not used during lessons.",
      candidateText:
        "As I previously explained, I'm so sorry if this has caused any upset, but we'll see depending on how things go. It may be possible to review this later, but I just wanted to let you know. Is that okay?",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.parentInterpretationRisk).toBe("high")
    expect(result.authorityScore).toBeLessThan(45)
    expect(result.clarityScore).toBeLessThan(45)
    expect(result.regretRisk).toBe("high")
  })

  it("sets regret risk to low for a strong composite", () => {
    const result = evaluateProfessionalJudgement({
      sourceText:
        "Phones will not be used during lessons. I apply this consistently so that expectations are clear and fair for all students.",
      candidateText:
        "Phones will not be used during lessons. I apply this consistently so that expectations are clear and fair for all students.",
      sourceIntent: "limit",
      language: "en",
      safetyAnalysis: null,
    })

    expect(result.parentInterpretationRisk).toBe("low")
    expect(result.authorityScore).toBeGreaterThanOrEqual(82)
    expect(result.clarityScore).toBeGreaterThanOrEqual(88)
    expect(result.replyLikelihood).toBe("low")
    expect(result.regretRisk).toBe("low")
  })
})
