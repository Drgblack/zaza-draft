import { resolveExplanationTier } from "@/components/main-editor"
import type { DeescalationSummary } from "@/lib/deescalation/types"

const summary: DeescalationSummary = {
  wasDeescalated: true,
  coachingLine: "I softened it.",
  flaggedPhrases: [],
}

describe("resolveExplanationTier", () => {
  it("prefers the explicit input reframe tier", () => {
    expect(resolveExplanationTier("tier2", summary)).toBe("tier2")
  })

  it("falls back to tier1 when a de-escalation summary exists", () => {
    expect(resolveExplanationTier(null, summary)).toBe("tier1")
  })

  it("returns tier1 when flagged phrases exist even if wasDeescalated is false", () => {
    const flaggedSummary: DeescalationSummary = {
      wasDeescalated: false,
      coachingLine: "Softened the wording to keep things calm.",
      flaggedPhrases: [
        {
          originalSnippet: "frustrated language",
          category: "insult",
          suggestionSnippet: "focus on the behaviour",
        },
      ],
    }
    expect(resolveExplanationTier(null, flaggedSummary)).toBe("tier1")
  })

  it("returns null when nothing triggered", () => {
    expect(resolveExplanationTier(null, null)).toBeNull()
  })
})
