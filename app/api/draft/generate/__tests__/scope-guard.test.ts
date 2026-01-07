import { describe, expect, it } from "vitest"
import { isOutOfScopeQuery, OUT_OF_SCOPE_REDIRECT_MESSAGE } from "@/app/api/draft/generate/scope-guard"

const OUT_OF_SCOPE_PROMPTS = [
  "how do I bake a chocolate cake?",
  "how do I change my car battery?",
  "best time of year to visit Thailand?",
  "what can I turn leftover chilli con carne into?",
]

describe("out-of-scope redirect guard", () => {
  it("matches known non-teaching queries", () => {
    OUT_OF_SCOPE_PROMPTS.forEach((prompt) => {
      expect(isOutOfScopeQuery(prompt)).toBe(true)
    })
  })

  it("exported message contains the redirect copy", () => {
    expect(OUT_OF_SCOPE_REDIRECT_MESSAGE).toContain("This doesn't look like a school report or parent message.")
    expect(OUT_OF_SCOPE_REDIRECT_MESSAGE).toContain("Zaza Draft is designed to help you write professional")
  })

  it("does not block school-related prompts even when they mention keywords", () => {
    const allowedPrompts = [
      "Write a parent message about our class baking activity.",
      "Create a short report comment about a student's progress in Food Tech.",
      "Draft an excursion note for our trip to the museum.",
    ]
    allowedPrompts.forEach((prompt) => {
      expect(isOutOfScopeQuery(prompt)).toBe(false)
    })
  })
})
