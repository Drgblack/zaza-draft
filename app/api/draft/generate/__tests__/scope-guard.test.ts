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
  "Schreiben Sie eine Nachricht an die Eltern über unsere Geographiestunde, in der wir die Hauptstadt Frankreichs kennengelernt haben.",
]

const GERMAN_REJECTED_PROMPTS = [
  "Schreibe ein Gedicht über den Sommer.",
  "Wie backe ich einen Kaffee-Kuchen?",
  "Was ist die Hauptstadt von Frankreich?",
]

const SCHOOL_CONTEXT_ACCEPTED_PROMPTS = [
  "Adam had shown disruptive behaviour leading to waste almost 22 minutes of today's online session. Urgent action needs to be taken. Online sessions must be observed by a guardian to guarantee the avoidance of abrupt stop.",
  "Adam had shown disruptive behayiour leading to waste almost 22 minutes of today's online session. Urgent action needs to be taken. Online sessions must be observed by a guardian to guarantee the avoidance of abrupt stop.",
  "Mia was disruptive in our session this morning. Her guardian needs to be informed about today's incident.",
  "I want to follow up about Lukas's progress. He has been struggling with attendance and his work is showing the impact.",
  "Sarah is a hardworking pupil who consistently engages in lessons. Her marking shows steady improvement this term.",
]

const NON_SCHOOL_REJECTED_PROMPTS = [
  "What is the best recipe for chocolate cake with vanilla frosting?",
  "What is the weather like in London tomorrow?",
  "Write me a Python function to sort a list of integers in ascending order.",
  "I need to write a difficult message to my brother about our father's will.",
  "Buy our amazing new product today and save 50% with code SUMMER.",
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
      "Write a message to parents about our geography lesson where we learned the capital of France.",
      "Write a note to parents about our class bake sale and that we will be making muffins.",
    ]
    schoolPrompts.forEach((prompt) => {
      expect(isValidDraftRequest(prompt)).toBe(true)
    })
  })

  it("treats diagnostic speculation as in-scope so safety coaching can handle it", () => {
    const prompts = [
      "I think he may have ADHD",
      "I wonder if he might be on the autism spectrum because he struggles to settle",
    ]

    prompts.forEach((prompt) => {
      expect(isOutOfScopeQuery(prompt)).toBe(false)
      expect(isValidDraftRequest(prompt, "parent_message")).toBe(true)
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

  it("accepts the Adam note with exact school wording", () => {
    expect(isValidDraftRequest(SCHOOL_CONTEXT_ACCEPTED_PROMPTS[0], "parent_message")).toBe(true)
  })

  it("accepts the Adam note when OCR corrupts behaviour", () => {
    expect(isValidDraftRequest(SCHOOL_CONTEXT_ACCEPTED_PROMPTS[1], "parent_message")).toBe(true)
  })

  it("accepts school notes that rely on multiple context signals", () => {
    expect(isValidDraftRequest(SCHOOL_CONTEXT_ACCEPTED_PROMPTS[2], "parent_message")).toBe(true)
  })

  it("accepts sensitive parent communication about progress and attendance", () => {
    expect(isValidDraftRequest(SCHOOL_CONTEXT_ACCEPTED_PROMPTS[3], "parent_message")).toBe(true)
  })

  it("accepts report comments grounded in pupil progress and marking", () => {
    expect(isValidDraftRequest(SCHOOL_CONTEXT_ACCEPTED_PROMPTS[4], "report_comment")).toBe(true)
  })

  it("rejects recipe prompts", () => {
    expect(isValidDraftRequest(NON_SCHOOL_REJECTED_PROMPTS[0], "parent_message")).toBe(false)
  })

  it("rejects weather prompts", () => {
    expect(isValidDraftRequest(NON_SCHOOL_REJECTED_PROMPTS[1], "parent_message")).toBe(false)
  })

  it("rejects code-writing prompts", () => {
    expect(isValidDraftRequest(NON_SCHOOL_REJECTED_PROMPTS[2], "parent_message")).toBe(false)
  })

  it("rejects unrelated personal relationship prompts", () => {
    expect(isValidDraftRequest(NON_SCHOOL_REJECTED_PROMPTS[3], "parent_message")).toBe(false)
  })

  it("rejects marketing copy prompts", () => {
    expect(isValidDraftRequest(NON_SCHOOL_REJECTED_PROMPTS[4], "parent_message")).toBe(false)
  })
})
