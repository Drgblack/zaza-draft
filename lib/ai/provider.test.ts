import { describe, expect, it } from "vitest"

import { buildSystemPrompt } from "@/lib/ai/provider"

const baseInput = {
  situation: "Student is working through the same challenge repeatedly.",
  tone: "warm" as const,
  language: "de" as const,
  mode: "parent_message" as const,
  pronounPreference: "auto" as const,
}

describe("buildSystemPrompt", () => {
  it("adds a strict language constraint when forceLanguage is true", () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      forceLanguage: true,
    })
    expect(prompt).toContain("Respond strictly in German")
  })

  it("does not emit the language constraint when forceLanguage is false", () => {
    const prompt = buildSystemPrompt(baseInput)
    expect(prompt).not.toContain("Respond strictly in German")
  })

  it("adds the DE tone contract when the locale is German", () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      uiLocale: "de-DE",
    })
    expect(prompt).toContain("DE tone contract")
    expect(prompt).toContain("Termin vereinbaren")
  })
})
