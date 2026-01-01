export type DeescalationCategory =
  | "insult"
  | "sarcasm"
  | "threat"
  | "absolute"
  | "inflammatory"
  | "profanity"

export type DeescalationSeverity = "low" | "medium" | "high"

export interface FlaggedPhrase {
  snippet: string
  category: DeescalationCategory
  severity: DeescalationSeverity
}

export interface FlaggedPhraseSummary {
  originalSnippet: string
  category: DeescalationCategory
  suggestionSnippet: string
}

export interface DetectionResult {
  flaggedPhrases: FlaggedPhrase[]
  maxSeverity: DeescalationSeverity
  wasDeescalated: boolean
}

export interface DeescalationSummary {
  wasDeescalated: boolean
  coachingLine: string
  flaggedPhrases: FlaggedPhraseSummary[]
}

export interface RewriteOutcome {
  cleanedText: string
  summary: DeescalationSummary
}
