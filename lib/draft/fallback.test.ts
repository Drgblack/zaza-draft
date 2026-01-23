import { buildFallbackDraft, type DraftFallbackContext } from "./fallback"

const baseContext: Omit<DraftFallbackContext, "language" | "teacherSignatureName"> = {
  mode: "parent_message",
  tone: "professional",
  requestId: "test",
  uidHash: "abc123",
  studentPronounPreference: "auto",
  studentFirstName: "Kai",
}

describe("fallback drafting signature hygiene", () => {
  it("Case A (DE) omits teacher name when not provided", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "de",
      teacherSignatureName: undefined,
    }

    const text = buildFallbackDraft(context)
    expect(text).not.toContain("Samantha")
    expect(text).not.toContain("[Lehrkraft Name]")
    expect(text).not.toContain("Ã")
    expect(text.trim().endsWith("Mit freundlichen Grüßen")).toBe(true)
  })

  it("Case B (EN) omits teacher name and placeholders", () => {
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "en",
      teacherSignatureName: undefined,
    }

    const text = buildFallbackDraft(context)
    expect(text).not.toContain("Samantha")
    expect(text).not.toContain("[Your Name]")
    expect(text.trim().endsWith("Kind regards,")).toBe(true)
  })

  it("respects a final resolved greeting when fallback runs", () => {
    const finalGreeting = "Guten Tag, Dr. Markus Schneider,"
    const context: DraftFallbackContext = {
      ...baseContext,
      language: "de",
      teacherSignatureName: undefined,
      greeting: {
        text: finalGreeting,
        name: "Dr. Markus Schneider",
      },
      greetingFinal: true,
    }

    const text = buildFallbackDraft(context)
    const lines = text.split("\n")
    expect(lines[1]).toBe(finalGreeting)
    expect(text).not.toContain("Liebe Eltern,")
    expect(text).toContain("Mit freundlichen Grüßen")
  })
})
