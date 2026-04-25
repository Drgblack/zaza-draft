import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

export type TeacherDraftFeedbackLevel = "already_strong" | "light_touch"
export type TeacherDraftFeedbackReason =
  | "preserved_tone"
  | "maintained_boundaries"
  | "risk_checked"

export interface TeacherDraftFeedback {
  verdict: TeacherDraftFeedbackLevel
  level: TeacherDraftFeedbackLevel
  reasons: TeacherDraftFeedbackReason[]
}

const NEGATIVE_SIGNAL_CATEGORIES = new Set([
  "accusation",
  "escalation",
  "frustration",
  "negative_generalisation",
  "prescriptive_demand",
])

function hasNegativeSignals(analysis?: SafetyEngineOutput | null) {
  return (analysis?.triggeredSignals ?? []).some((signal) =>
    NEGATIVE_SIGNAL_CATEGORIES.has(signal.category),
  )
}

function isLowRiskTeacherDraft(analysis?: SafetyEngineOutput | null) {
  if (!analysis) {
    return false
  }

  if (
    analysis.riskLevel !== "low" ||
    analysis.structuralImbalance ||
    analysis.professionalRiskFlags.length > 0 ||
    hasNegativeSignals(analysis)
  ) {
    return false
  }

  return analysis.toneClass !== "accusatory" && analysis.toneClass !== "defensive"
}

export function resolveTeacherDraftFeedback(options: {
  similarity: number
  sourceWordCount: number
  candidateWordCount: number
  expandsContent: boolean
  introducedInstitutionalPhrases?: string[]
  introducedAuthoritySoftening?: string[]
  inputSafetyAnalysis?: SafetyEngineOutput | null
  outputSafetyAnalysis?: SafetyEngineOutput | null
  deescalationSummary?: DeescalationSummary | null
}) {
  const {
    similarity,
    sourceWordCount,
    candidateWordCount,
    expandsContent,
    introducedInstitutionalPhrases = [],
    introducedAuthoritySoftening = [],
    inputSafetyAnalysis,
    outputSafetyAnalysis,
    deescalationSummary,
  } = options

  if (
    !isLowRiskTeacherDraft(inputSafetyAnalysis) ||
    !isLowRiskTeacherDraft(outputSafetyAnalysis) ||
    deescalationSummary?.wasDeescalated ||
    expandsContent ||
    introducedInstitutionalPhrases.length > 0 ||
    introducedAuthoritySoftening.length > 0
  ) {
    return null
  }

  const wordDelta = Math.abs(candidateWordCount - sourceWordCount)
  const reasons: TeacherDraftFeedbackReason[] = [
    "preserved_tone",
    "maintained_boundaries",
    "risk_checked",
  ]

  if (similarity >= 0.9 && wordDelta <= 6) {
    return {
      verdict: "already_strong",
      level: "already_strong",
      reasons,
    } satisfies TeacherDraftFeedback
  }

  if (similarity >= 0.8 && candidateWordCount <= Math.ceil(sourceWordCount * 1.12)) {
    return {
      verdict: "light_touch",
      level: "light_touch",
      reasons,
    } satisfies TeacherDraftFeedback
  }

  return null
}
