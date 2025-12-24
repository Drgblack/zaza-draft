export type SuggestionConfidence = 0 | 0.25 | 0.5 | 0.75 | 1

export interface Suggestion {
  id: string
  kind: "rewrite" | "tone" | "clarify" | "structure" | "evidence"
  confidence: number
  title: string
  rationale: string
  pedagogyTag?: "differentiation" | "clarity" | "scaffolding" | "feedback" | "tone"
  diffHtml: string
  range: { from: number; to: number }
  createdAt: string
  viewed?: boolean
}

export interface SuggestionFeedback {
  suggestionId: string
  action: "accept" | "insert_as_comment" | "dismiss" | "not_helpful"
  reason?: "off_prompt" | "tone_mismatch" | "fact_issue" | "too_generic" | "too_long" | "other"
  note?: string
  confidenceBucket: SuggestionConfidence
  docMeta: { docId: string; language: "en" | "de"; wordCount: number }
  latencyMs?: number
  ts: string
  optedIn: boolean
}

export type DocumentType = "lesson-plan" | "email" | "report"

export type DraftTone = "warm" | "professional" | "direct" | "empathetic"
export type DraftLanguage = "en" | "de"

export interface Document {
  id: string
  title: string
  type: DocumentType
  content: string
  updatedAt: string
}

export function getConfidenceBucket(confidence: number): SuggestionConfidence {
  if (confidence >= 0.8) return 1
  if (confidence >= 0.6) return 0.75
  if (confidence >= 0.4) return 0.5
  if (confidence >= 0.2) return 0.25
  return 0
}

export function getConfidenceLabel(confidence: number): "High" | "Medium" | "Low" {
  if (confidence >= 0.8) return "High"
  if (confidence >= 0.5) return "Medium"
  return "Low"
}
