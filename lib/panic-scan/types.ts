export type PanicScanStatus = "processing" | "completed" | "failed"

export type MessageType =
  | "parent_complaint"
  | "student_concern"
  | "admin_feedback"
  | "colleague_conflict"
  | "official_notice"
  | "urgent_request"
  | "general_inquiry"

export type EmotionalTone =
  | "angry"
  | "frustrated"
  | "passive_aggressive"
  | "demanding"
  | "anxious"
  | "neutral"
  | "supportive"

export type SuggestedResponse =
  | "acknowledge_concern"
  | "provide_info"
  | "schedule_meeting"
  | "escalate_to_admin"

export interface MessageClassification {
  messageType: MessageType
  emotionalTone: EmotionalTone
  riskLevel: "low" | "medium" | "high"
  urgency: "low" | "medium" | "high"
  confidenceScore: number
}

export interface PanicScanAnalysis {
  summary: string
  emotionalInterpretation: string
  professionalRisk: string
  likelyMeaning: string
  suggestedResponse: SuggestedResponse
}

export interface PanicScanDocument {
  scanId: string
  userId: string
  fileName: string
  platform: "web" | "mobile_ios" | "mobile_android" | string
  mediaPath: string
  status: PanicScanStatus
  extractedText?: string
  classification?: MessageClassification
  analysis?: PanicScanAnalysis
  processingTimeMs?: number
  createdAt: string
  expiresAt: string
  sessionId?: string
  failureReason?: string
}
