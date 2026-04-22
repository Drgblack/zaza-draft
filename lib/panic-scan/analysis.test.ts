import { describe, expect, it } from "vitest"

import { buildHeuristicPanicAnalysis } from "@/lib/panic-scan/analysis"

describe("buildHeuristicPanicAnalysis", () => {
  it("classifies urgent parent concerns without an API call", () => {
    const result = buildHeuristicPanicAnalysis(
      [
        "My child came home upset and said another student pushed him at lunch.",
        "I need to understand what happened today and what support will be in place tomorrow.",
        "Please call me as soon as possible.",
      ].join(" "),
      "en",
    )

    expect(result.classification.messageType).toBe("urgent_request")
    expect(result.classification.riskLevel).toBe("high")
    expect(result.classification.urgency).toBe("high")
    expect(result.analysis.suggestedResponse).toBe("escalate_to_admin")
  })

  it("returns localized German fallback copy", () => {
    const result = buildHeuristicPanicAnalysis(
      [
        "Mein Kind war heute nach dem Unterricht sehr aufgebracht.",
        "Ich bin besorgt und möchte wissen, was passiert ist und wie Sie morgen weiter vorgehen.",
      ].join(" "),
      "de",
    )

    expect(result.analysis.summary).toContain("Nachricht")
    expect(result.analysis.professionalRisk).toContain("professionelles Risiko")
  })
})
