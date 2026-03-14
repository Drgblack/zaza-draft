import { describe, expect, it } from "vitest"

import { extractPronounPreferenceFromNotes, inferPronounResolution, repairPronounCaseGrammar } from "./pronouns"

describe("pronoun inference helpers", () => {
  it("extracts explicit he/his hints from teacher notes", () => {
    const preference = extractPronounPreferenceFromNotes("I need his parents to know this.")
    expect(preference).toBe("he")
  })

  it("treats mixed hints as they", () => {
    const preference = extractPronounPreferenceFromNotes("His parents and her carers are aware.")
    expect(preference).toBe("they")
  })

  it("falls back to neutral no-pronoun handling when the name signal is ambiguous", () => {
    const fallback = inferPronounResolution("auto", "Casey")
    expect(fallback.resolvedPreference).toBe("avoid")
    expect(fallback.reason).toBe("fallback")
  })

  it("resolves a common female name to she/her when confidence is high", () => {
    const result = inferPronounResolution("auto", "Jane")
    expect(result.resolvedPreference).toBe("she")
    expect(result.reason).toBe("dataset")
  })

  it("resolves a common male name to he/him when confidence is high", () => {
    const result = inferPronounResolution("auto", "Michael")
    expect(result.resolvedPreference).toBe("he")
    expect(result.reason).toBe("dataset")
  })

  it("respects an explicit neutral pronoun selection over name inference", () => {
    const result = inferPronounResolution("they", "Jane")
    expect(result.resolvedPreference).toBe("they")
    expect(result.reason).toBe("manual")
  })

  it("respects an explicit no-pronoun selection over name inference", () => {
    const result = inferPronounResolution("avoid", "Jane")
    expect(result.resolvedPreference).toBe("avoid")
    expect(result.reason).toBe("manual")
  })

  it("prefers teacher-provided pronouns over name inference", () => {
    const result = inferPronounResolution("auto", "Casey", "I'm writing about his progress.")
    expect(result.resolvedPreference).toBe("he")
    expect(result.reason).toBe("teacher")
  })

  it("matches accented names when inferring from the dataset", () => {
    const accented = inferPronounResolution("auto", "Élodie")
    expect(accented.resolvedPreference).toBe("she")
    expect(accented.reason).toBe("dataset")
  })

  it("repairs object-form pronouns leaked into possessive and subject positions", () => {
    const repaired = repairPronounCaseGrammar(
      "Them performance in reading has improved. Him is more confident in discussion.",
    )
    expect(repaired).toContain("Their performance in reading has improved.")
    expect(repaired).toContain("He is more confident in discussion.")
  })
})
