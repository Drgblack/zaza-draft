import { describe, expect, it } from "vitest"

import { extractPronounPreferenceFromNotes, inferPronounResolution } from "./pronouns"

describe("pronoun inference helpers", () => {
  it("extracts explicit he/his hints from teacher notes", () => {
    const preference = extractPronounPreferenceFromNotes("I need his parents to know this.")
    expect(preference).toBe("he")
  })

  it("treats mixed hints as they", () => {
    const preference = extractPronounPreferenceFromNotes("His parents and her carers are aware.")
    expect(preference).toBe("they")
  })

  it("falls back to they when nothing explicit is provided", () => {
    const fallback = inferPronounResolution("auto", "Casey")
    expect(fallback.resolvedPreference).toBe("they")
    expect(fallback.reason).toBe("fallback")
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
})
