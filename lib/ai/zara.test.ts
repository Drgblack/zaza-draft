import { describe, expect, it } from "vitest"

import { buildZaraSystemPrompt, resolveZaraLanguage } from "@/lib/ai/zara"

describe("Zara AI helpers", () => {
  it("resolves locale to a language code", () => {
    expect(resolveZaraLanguage("de-DE")).toBe("de")
    expect(resolveZaraLanguage("de_CH")).toBe("de")
    expect(resolveZaraLanguage("en-US")).toBe("en")
    expect(resolveZaraLanguage()).toBe("en")
  })

  it("builds a system prompt that enforces tone and language", () => {
    const englishPrompt = buildZaraSystemPrompt("en-US")
    expect(englishPrompt).toContain("friendly, trustworthy teaching assistant")
    expect(englishPrompt).toContain("Respond in English")

    const germanPrompt = buildZaraSystemPrompt("de-DE")
    expect(germanPrompt).toContain("Antworten Sie auf Deutsch")
    expect(germanPrompt).toContain("calm, supportive")
    expect(germanPrompt).toContain("clarifying question")
  })
})
