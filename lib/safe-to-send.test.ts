import { describe, expect, it } from "vitest"

import { assessSafeToSend } from "@/lib/safe-to-send"

describe("assessSafeToSend", () => {
  it("marks calm low-risk drafts as safe to send", () => {
    const assessment = assessSafeToSend({
      safetyAnalysis: {
        riskLevel: "low",
        toneClass: "collaborative",
        triggeredSignals: [],
        professionalRiskFlags: [],
        reactionForecast: {
          collaborative: 45,
          concerned: 25,
          defensive: 15,
          hostile: 0,
          confused: 15,
        },
      },
    })

    expect(assessment?.status).toBe("READY_TO_SEND")
  })

  it("marks softened but still delicate drafts as sensitive topics", () => {
    const assessment = assessSafeToSend({
      safetyAnalysis: {
        riskLevel: "medium",
        toneClass: "defensive",
        triggeredSignals: [],
        professionalRiskFlags: [],
        reactionForecast: {
          collaborative: 20,
          concerned: 20,
          defensive: 30,
          hostile: 10,
          confused: 20,
        },
      },
      deescalationSummary: {
        wasDeescalated: true,
        coachingLine: "Adjusted wording",
        flaggedPhrases: [],
      },
    })

    expect(assessment?.status).toBe("SENSITIVE_TOPIC")
  })

  it("marks escalatory drafts for one more revision", () => {
    const assessment = assessSafeToSend({
      safetyAnalysis: {
        riskLevel: "high",
        toneClass: "accusatory",
        triggeredSignals: [{ category: "escalation" } as any],
        professionalRiskFlags: [],
        reactionForecast: {
          collaborative: 10,
          concerned: 10,
          defensive: 45,
          hostile: 25,
          confused: 10,
        },
      },
    })

    expect(assessment?.status).toBe("REVIEW_ONCE_MORE")
  })
})
