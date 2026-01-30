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
    "Ich verstehe, dass die Aufgabenlast gerade sehr belastend wirkt, deshalb behalten wir den Fokus auf Stabilität.",
    "Wir planen zwei kurze Termine, um die nächsten Schritte zu besprechen, und ich bin für Sie da.",
    "Melden Sie sich gern, wenn Sie im Gespräch noch Fragen haben.",
    "Mit freundlichen Grüßen,",
  ].join("\n\n")

 fix/de-emotional-parity
  const mirroredEnglishScenario = [
    "Dear family, thank you for sharing how the homework load feels right now.",
    "I understand the impact on your child and we will keep the focus on gentle support.",
    "I'm committed to scheduling two brief check-ins and I plan to follow up after those meetings.",
    "Please feel free to reach out, let me know what days work, and happy to chat.",
    "Kind regards,",
  ].join("\n\n")

  const mirroredGermanScenario = [
    "Liebe Familie, danke, dass Sie offen schildern, wie belastend die Hausaufgabenlast gerade ist.",
    "Ich nehme wahr, dass die Situation schwer erscheint, und wir behalten den Fokus auf Stabilität.",
    "Ich bleibe an der Seite, organisiere zwei kurze Termine und halte Sie informiert.",
    "Rufen Sie mich gern an oder schreiben Sie mir, damit wir gemeinsam eine Lösung finden.",
    "Mit freundlichen Grüßen,",
  ].join("\n\n")

 main
  it("ensures English drafts meet the emotional structure threshold", () => {
    const result = evaluateEmotionalStructure(englishScenario, "en")
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.locale).toBe("en")
  })

 fix/de-emotional-parity
  it("ensures German drafts meet the emotional structure threshold alongside the English sample", () => {

  it("ensures German drafts meet the emotional structure threshold and matches the English score", () => {
 main
    const result = evaluateEmotionalStructure(germanScenario, "de")
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(4)
    expect(result.locale).toBe("de")
 fix/de-emotional-parity
  })

  it("passes the mirrored English and German scenario with a minimum emotional score", () => {
    const englishResult = evaluateEmotionalStructure(mirroredEnglishScenario, "en")
    const germanResult = evaluateEmotionalStructure(mirroredGermanScenario, "de")
    expect(englishResult.passed).toBe(true)
    expect(germanResult.passed).toBe(true)
    expect(englishResult.score).toBeGreaterThanOrEqual(4)
    expect(germanResult.score).toBeGreaterThanOrEqual(4)
  })

  it("matches the same emotional steps for mirrored English and German content", () => {
    const englishResult = evaluateEmotionalStructure(mirroredEnglishScenario, "en")
    const germanResult = evaluateEmotionalStructure(mirroredGermanScenario, "de")
    expect(englishResult.matchedSteps.slice().sort()).toEqual(germanResult.matchedSteps.slice().sort())

    const englishScore = evaluateEmotionalStructure(englishScenario, "en").score
    expect(result.score).toBe(englishScore)
 main
  })
})
