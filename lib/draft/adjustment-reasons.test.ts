import { describe, expect, it } from "vitest"

import {
  buildDraftAdjustmentReasons,
  buildSaferDraftCategories,
  buildDraftAdjustmentSummary,
  shouldShowToneSofteningExplanation,
} from "@/lib/draft/adjustment-reasons"
import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

function buildSafetyAnalysis(overrides: Partial<SafetyEngineOutput>): SafetyEngineOutput {
  return {
    riskScore: 40,
    riskLevel: "medium",
    triggeredSignals: [],
    toneClass: "collaborative",
    topicSensitivity: "medium",
    reactionForecast: {
      collaborative: 25,
      concerned: 25,
      defensive: 25,
      hostile: 15,
      confused: 10,
    },
    explanationLines: [],
    documentationModeAvailable: false,
    professionalRiskFlags: [],
    structuralImbalance: false,
    ...overrides,
  }
}

describe("buildDraftAdjustmentReasons", () => {
  it("returns specific reasons only for changes that were actually resolved", () => {
    const inputSafety = buildSafetyAnalysis({
      triggeredSignals: [
        {
          id: "acc_refusal_language",
          category: "accusation",
          label: "Refusal language",
          weight: 9,
          adjustedWeight: 9,
          patterns: ["refuses to"],
          matchMode: "any",
          proximityBoost: false,
          detectionNote: "test",
          matchedPhrase: "refuses to",
        } as any,
        {
          id: "cold_no_collaboration",
          category: "emotional_coldness",
          label: "No collaboration invitation",
          weight: 4,
          adjustedWeight: 4,
          patterns: [],
          matchMode: "absence",
          proximityBoost: false,
          detectionNote: "test",
        } as any,
      ],
      professionalRiskFlags: [
        {
          signalId: "pro_medical_speculation",
          label: "Medical or diagnostic speculation",
          matchedPhrase: "ADHD",
        },
      ],
    })

    const outputSafety = buildSafetyAnalysis({
      riskLevel: "low",
      riskScore: 4,
    })

    expect(
      buildDraftAdjustmentReasons({
        inputSafetyAnalysis: inputSafety,
        outputSafetyAnalysis: outputSafety,
      }),
    ).toEqual([
      "Replaced judgement wording with observation-based phrasing",
      "Removed diagnostic speculation",
      "Added a more collaborative next step",
    ])
  })

  it("uses de-escalation evidence for escalation wording when needed", () => {
    const deescalationSummary: DeescalationSummary = {
      wasDeescalated: true,
      coachingLine: "Softened the threat.",
      flaggedPhrases: [
        {
          originalSnippet: "if this continues",
          category: "threat",
          suggestionSnippet: "I will follow this up in school",
        },
      ],
    }

    expect(
      buildDraftAdjustmentReasons({
        inputSafetyAnalysis: null,
        outputSafetyAnalysis: null,
        deescalationSummary,
      }),
    ).toEqual(["Softened escalation risk"])
  })

  it("only shows the separate tone-softening panel when no specific adjustment reasons are present", () => {
    expect(shouldShowToneSofteningExplanation("tier1", ["Softened escalation risk"])).toBe(false)
    expect(shouldShowToneSofteningExplanation("tier1", [])).toBe(true)
    expect(shouldShowToneSofteningExplanation(null, [])).toBe(false)
  })
})

describe("buildDraftAdjustmentSummary", () => {
  it("builds a one-sentence summary from actual adjustment reasons", () => {
    expect(
      buildDraftAdjustmentSummary([
        "Replaced judgement wording with observation-based phrasing",
        "Added a more collaborative next step",
      ]),
    ).toBe("Draft replaced judgmental wording with observation-based phrasing and added a collaborative next step.")
  })

  it("returns null when there are no adjustment reasons", () => {
    expect(buildDraftAdjustmentSummary([])).toBeNull()
  })
})

describe("buildSaferDraftCategories", () => {
  it("maps resolved safety changes into compact first-value categories", () => {
    const inputSafety = buildSafetyAnalysis({
      triggeredSignals: [
        {
          id: "cold_no_collaboration",
          category: "escalation",
          label: "Escalation wording",
          weight: 5,
          adjustedWeight: 5,
          patterns: ["escalate"],
          matchMode: "any",
          proximityBoost: false,
          detectionNote: "test",
        } as any,
        {
          id: "blame",
          category: "accusation",
          label: "Blame language",
          weight: 5,
          adjustedWeight: 5,
          patterns: ["you caused"],
          matchMode: "any",
          proximityBoost: false,
          detectionNote: "test",
        } as any,
      ],
    })
    const outputSafety = buildSafetyAnalysis({
      riskScore: 8,
      riskLevel: "low",
      triggeredSignals: [],
    })

    expect(
      buildSaferDraftCategories({
        inputSafetyAnalysis: inputSafety,
        outputSafetyAnalysis: outputSafety,
        deescalationSummary: {
          wasDeescalated: true,
          coachingLine: "Made calmer.",
          flaggedPhrases: [
            {
              originalSnippet: "escalate this",
              suggestionSnippet: "follow up on this",
              category: "threat",
            },
          ],
        },
      }),
    ).toEqual([
      "softened_escalation",
      "reduced_blame",
      "clearer_next_step",
      "professional_tone",
    ])
  })
})
