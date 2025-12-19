import type { SuggestionFeedback, Suggestion } from "./types"
import { getConfidenceBucket } from "./types"

interface FeedbackOptions {
  privacyOptIn: boolean
  currentDocId: string
  currentLanguage: "en" | "de"
  wordCount: number
}

export function createSuggestionFeedback(
  suggestion: Suggestion,
  action: "accept" | "insert_as_comment" | "dismiss" | "not_helpful",
  options: FeedbackOptions,
  reason?: string,
  note?: string,
  latencyMs?: number,
): SuggestionFeedback {
  return {
    suggestionId: suggestion.id,
    action,
    reason: reason as SuggestionFeedback["reason"],
    note,
    confidenceBucket: getConfidenceBucket(suggestion.confidence),
    docMeta: {
      docId: options.currentDocId,
      language: options.currentLanguage,
      wordCount: options.wordCount,
    },
    latencyMs,
    ts: new Date().toISOString(),
    optedIn: options.privacyOptIn,
  }
}

export function emitFeedback(feedback: SuggestionFeedback) {
  // Only send feedback if user has opted in
  if (!feedback.optedIn) {
    console.log("[v0] Feedback not sent (privacy opt-out):", feedback)
    return
  }

  // In production, this would send to an analytics endpoint
  console.log("[v0] Feedback emitted:", feedback)

  // Simulate API call
  // fetch('/api/feedback', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(feedback)
  // })
}
