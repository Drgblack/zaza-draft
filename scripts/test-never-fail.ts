import assert from "node:assert"
import { generateDraftWithFallback, ProviderRequestInput } from "../lib/draft/fallback"
import type { DraftMode } from "../lib/types"

const input: ProviderRequestInput = {
  situation: "The student is struggling but working hard.",
  tone: "warm",
  language: "en",
  context: {
    subject: "Math",
  },
  rewrite: false,
  previousDraft: undefined,
  pronounPreference: "auto",
  mode: "parent_message",
}

async function main() {
  const fallbackContext: {
    mode: DraftMode
    tone: ProviderRequestInput["tone"]
    language: ProviderRequestInput["language"]
    requestId: string
    uidHash: string
  } = {
    mode: "parent_message",
    tone: "warm",
    language: "en",
    requestId: "test-id",
    uidHash: "test-hash",
  }

  const result = await generateDraftWithFallback(input, fallbackContext, async () => {
    throw new Error("simulated failure")
  })

  assert(result.usedFallback, "Fallback should be used when provider throws")
  assert(result.result.text.length > 0, "Fallback text must be non-empty")
  assert(result.errorCode, "Fallback response must include an error code")
  console.log("Never-fail fallback test passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
