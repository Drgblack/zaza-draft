export interface ZazaSignal {
  signalId: string
  sessionId: string
  uidHash: string
  schoolId?: string
  timestamp: number
  signalType: ZazaSignalType
  payload: ZazaSignalPayload
  appVersion: string
  locale: string
}

export type ZazaSignalType =
  | "draft_generated"
  | "draft_fallback_used"
  | "draft_copy_edit_only"
  | "draft_rewrite_triggered"
  | "quality_verdict_emitted"
  | "judgement_score_emitted"
  | "low_confidence_fallback"
  | "draft_accepted"
  | "draft_edited_minor"
  | "draft_edited_major"
  | "draft_discarded"
  | "draft_regenerated"
  | "risk_strip_viewed"
  | "risk_strip_ignored"
  | "risk_strip_caused_pause"
  | "risk_strip_caused_edit"
  | "send_confidence_high_accepted"
  | "send_confidence_medium_accepted"
  | "send_confidence_low_accepted"
  | "send_confidence_low_discarded"
  | "teacher_draft_mode_used"
  | "already_strong_path_used"
  | "intent_classified"
  | "register_correction_applied"
  | "spelling_correction_applied"

export interface DraftGeneratedPayload {
  modelUsed: string
  generationAttempts: number
  sourceWordCount: number
  outputWordCount: number
  inputIntent: string
  languagePair: string
  latencyMs: number
}

export interface QualityVerdictPayload {
  verdict: "already_strong" | "improved" | "needs_rewrite"
  violationCategories: string[]
  violationCount: number
  blockingViolationCount: number
  advisoryViolationCount: number
}

export interface JudgementScorePayload {
  sendConfidenceScore: number
  clarityScore: number
  authorityScore: number
  replyLikelihood: "low" | "medium" | "high"
  regretRisk: "low" | "medium" | "high"
  parentInterpretationRisk: "low" | "medium" | "high"
  boundaryStrengthScore: number
  sourceIntent: string
  parentEmotionalState?: string
}

export interface TeacherInteractionPayload {
  interactionType: "accepted" | "edited_minor" | "edited_major" | "discarded" | "regenerated"
  timeToActionMs: number
  sendConfidenceScore?: number
  verdictAtAction?: string
  editDistanceCategory?: "none" | "minor" | "major"
}

export interface RiskStripPayload {
  interactionType: "viewed" | "ignored" | "caused_pause" | "caused_edit"
  sendConfidenceScore: number
  replyLikelihood: "low" | "medium" | "high"
  regretRisk: "low" | "medium" | "high"
  viewDurationMs: number
  subsequentAction?: "sent" | "edited" | "discarded" | "regenerated"
}

export interface SendConfidencePayload {
  scoreAtSend: number
  scoreBand: "high" | "medium" | "low"
  teacherAction: "sent" | "discarded"
  replyLikelihood: "low" | "medium" | "high"
  regretRisk: "low" | "medium" | "high"
}

export interface FeatureUsagePayload {
  feature: string
  context?: string
}

export type ZazaSignalPayload =
  | DraftGeneratedPayload
  | QualityVerdictPayload
  | JudgementScorePayload
  | TeacherInteractionPayload
  | RiskStripPayload
  | SendConfidencePayload
  | FeatureUsagePayload
