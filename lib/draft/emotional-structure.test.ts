import { describe, expect, it } from "vitest"

import { evaluateEmotionalStructure } from "./emotional-structure"

describe("evaluateEmotionalStructure", () => {
  const englishScenario = [
    "Dear family, thank you for sharing your concerns about the homework load.",
    "I understand how overwhelming this feels and want to keep the focus on supporting your child.",
    "I'm committed to checking in with brief updates and will set up a quick post-meeting this week.",
    "Please feel free to reach out when another Thursday works for you.",
    "Kind regards,",
  ].join("\n\n")

  const germanScenario = [
    "Liebe Familie, danke, dass Sie mir die aktuelle Situation schildern.",
    "Ich verstehe, dass die Aufgabenlast gerade sehr belastend wirkt, deshalb behalten wir den Fokus auf StabilitÃ¤t.",
    "Wir planen zwei kurze Termine, um die nÃ¤chsten Schritte zu besprechen, und ich bin fÃ¼r Sie da.",
    "Melden Sie sich gern, wenn Sie im GesprÃ¤ch noch Fragen haben.",
    "Mit freundlichen GrÃ¼ÃŸen,",
  ].join("\n\n")

  it("ensures English drafts meet the emotional structure threshold", () => {
    const result = evaluateEmotionalStructure(englishScenario, "en")
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.locale).toBe("en")
  })

  it("ensures German drafts meet the emotional structure threshold and matches the English score", () => {
    const result = evaluateEmotionalStructure(germanScenario, "de")
    console.log("[DEBUG] DE emotional structure result:")
console.log(result)
console.log("[DEBUG] DE emotional structure result keys:", Object.keys(result as any));
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.locale).toBe("de")
    const englishScore = evaluateEmotionalStructure(englishScenario, "en").score
    expect(result.score).toBeGreaterThanOrEqual(englishScore - 1)
  })
})




