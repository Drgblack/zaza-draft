import { describe, expect, it } from "vitest"
import {
  isOutOfScopeQuery,
  isValidDraftRequest,
  OUT_OF_SCOPE_REDIRECT_MESSAGE,
} from "@/app/api/draft/generate/scope-guard"

const OUT_OF_SCOPE_PROMPTS = [
  "how do I bake a chocolate cake?",
  "how do I change my car battery?",
  "best time of year to visit Thailand?",
  "what can I turn leftover chilli con carne into?",
  "how do I bake toffee muffins?",
  "what is the capital of France?",
]

const GERMAN_ACCEPTED_PROMPTS = [
  "Formuliere eine Elternnachricht zum Lernfortschritt im Lesen.",
  "Erstelle einen sachlichen Zeugniskommentar zum Leseverständnis eines Schülers.",
  "Schreibe eine Nachricht an die Eltern über den Ausflug der Klasse.",
  "Schreibe einen Lernstandsbericht zur Mathematikleistung.",
]

const GERMAN_REJECTED_PROMPTS = [
  "Schreibe ein Gedicht über den Sommer.",
  "Wie backe ich einen Kaffee-Kuchen?",
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

  it("rejects curiosity and general prompts via the eligibility gate", () => {
    const generalPrompts = [
      "What do monkeys in a zoo eat for breakfast?",
      "How do I change the steering wheel on my bicycle?",
      "How do I bake a cake?",
      "What is the capital of France?",
    ]
    generalPrompts.forEach((prompt) => {
      expect(isValidDraftRequest(prompt)).toBe(false)
    })
  })

  it("rejects recipe/capital prompts even when reporting modes are requested", () => {
    const prompts = [
      "How do I bake toffee muffins?",
      "What is the capital of France?",
      "Wie backe ich Toffee-Muffins?",
      "Was ist die Hauptstadt von Frankreich?",
    ]
    prompts.forEach((prompt) => {
      expect(isValidDraftRequest(prompt, "parent_message")).toBe(false)
      expect(isValidDraftRequest(prompt, "report_comment")).toBe(false)
    })
  })

  it("accepts explicit school communication requests", () => {
    const schoolPrompts = [
      "Write a parent message about our class baking activity.",
      "Draft a report comment on a student's reading progress.",
      "Rewrite this to sound professional for a parent email.",
    ]
    schoolPrompts.forEach((prompt) => {
      expect(isValidDraftRequest(prompt)).toBe(true)
    })
  })

  it("accepts German prompts when mode indicates parent message or report comment", () => {
    GERMAN_ACCEPTED_PROMPTS.forEach((prompt) => {
      expect(isValidDraftRequest(prompt, "parent_message")).toBe(true)
      expect(isValidDraftRequest(prompt, "report_comment")).toBe(true)
    })
  })

  it("rejects German out-of-scope prompts regardless of mode", () => {
    GERMAN_REJECTED_PROMPTS.forEach((prompt) => {
      expect(isValidDraftRequest(prompt, "parent_message")).toBe(false)
      expect(isOutOfScopeQuery(prompt)).toBe(true)
    })
  })
})
