import assert from "node:assert"
import { generateDraftWithFallback } from "../lib/draft/fallback"
import { PronounPreference } from "@/lib/types"

async function main() {
  const input = {
    situation: "Testing pronoun usage",
    tone: "warm" as const,
    language: "en" as const,
    pronounPreference: "she" as PronounPreference,
    mode: "parent_message" as const,
    context: {},
  }
  const fallbackContext = {
    mode: "parent_message" as const,
    tone: "warm" as const,
    language: "en" as const,
    requestId: "test",
    uidHash: "test",
    studentFirstName: "Sally",
    studentPronounPreference: "she" as PronounPreference,
  }

  const { result, usedFallback } = await generateDraftWithFallback(input, fallbackContext, async () => {
    throw new Error("forced fallback")
  })

  assert(usedFallback, "Fallback should be used")
  assert(result.text.includes("Sally"), "Fallback should mention the student's name")
  const occurrences = (result.text.match(/the student/gi) ?? []).length
  assert(occurrences <= 1, "Fallback should minimise 'the student' references")
  console.log("Student pronoun fallback test passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
