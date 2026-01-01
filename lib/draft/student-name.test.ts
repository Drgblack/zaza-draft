import { describe, expect, it } from "vitest"

import { cleanStudentName } from "./student-name"
import { inferPronounResolution } from "@/lib/text/pronouns"
import type { PronounPreference } from "@/lib/types"

describe("cleanStudentName", () => {
  it("removes parenthetical pronouns", () => {
    expect(cleanStudentName("Élodie (she/her)")).toBe("Élodie")
    expect(cleanStudentName("Alex (they/them)")).toBe("Alex")
    expect(cleanStudentName("Jordan (he/him/his)")).toBe("Jordan")
  })

  it("ignores other parentheses", () => {
    expect(cleanStudentName("Taylor (Year 7)")).toBe("Taylor (Year 7)")
    expect(cleanStudentName("Casey (Project Lead)")).toBe("Casey (Project Lead)")
  })

  it("trims whitespace", () => {
    expect(cleanStudentName("  Sam  ")).toBe("Sam")
  })

  it("returns empty string for empty input", () => {
    expect(cleanStudentName("")).toBe("")
    expect(cleanStudentName("   ")).toBe("")
  })
})

describe("pronoun integration with cleaned student name", () => {
  it("still resolves teacher-provided pronouns when the stored name is cleaned", () => {
    const rawName = "Élodie (she/her)"
    const cleanedName = cleanStudentName(rawName)
    const resolution = inferPronounResolution(
      "auto" satisfies PronounPreference,
      cleanedName,
      "I need her parents to know how supportive she has been.",
    )
    expect(cleanedName).toBe("Élodie")
    expect(resolution.resolvedPreference).toBe("she")
  })
})
