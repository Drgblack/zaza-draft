import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { DraftMode } from "@/lib/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"
import type { ReactionForecast } from "@/src/lib/safetyEngine/reactionForecaster"

export const DRAFT_INTERACTION_SCHEMA_NAME = "draft_interaction_event"
export const DRAFT_INTERACTION_SCHEMA_VERSION = 3

export const DRAFT_EVENT_NAMES = [
  "draft_created",
  "draft_modified",
  "rewrite_suggested",
  "rewrite_accepted",
  "rewrite_modified",
  "rewrite_rejected",
  "risk_flag_triggered",
  "reaction_prediction_generated",
  "documentation_mode_enabled",
  "edit_action",
] as const

export const DRAFT_EVENT_TYPES = DRAFT_EVENT_NAMES

export const DRAFT_MESSAGE_CONTEXTS = [
  "parent_email",
  "report_comment",
  "behaviour_note",
  "incident_record",
  "safeguarding_note",
  "admin_message",
  "student_feedback",
] as const

export const DRAFT_REWRITE_REASONS = [
  "tone_softening",
  "escalation_risk",
  "clarity",
  "documentation_precision",
  "safeguarding_language",
  "professionalism",
] as const

export const DRAFT_RISK_FLAG_TYPES = [
  "escalation_language",
  "accusation_language",
  "emotional_language",
  "unclear_documentation",
] as const

export const DRAFT_TIME_CONTEXTS = [
  "school_hours",
  "after_hours",
  "weekend",
] as const

export const DRAFT_WORKFLOW_TYPES = [
  "new_message",
  "rewrite_existing",
  "documentation_mode",
  "tone_adjustment",
] as const

export const DRAFT_REACTION_PREDICTIONS = [
  "calm",
  "confused",
  "defensive",
  "angry",
] as const

export const DRAFT_REGIONS = [
  "EU",
  "UK",
  "US",
  "other",
] as const

export const DRAFT_TEACHER_INTENTS = [
  "address_behaviour",
  "respond_to_complaint",
  "share_progress",
  "praise_student",
  "clarify_expectations",
  "document_incident",
  "attendance_issue",
  "administrative_notice",
  "safeguarding_note",
  "other",
] as const

export type DraftInteractionEventName = (typeof DRAFT_EVENT_NAMES)[number]
export type DraftInteractionEventType = DraftInteractionEventName
export type DraftInteractionMessageContext = (typeof DRAFT_MESSAGE_CONTEXTS)[number]
export type DraftInteractionRewriteReason = (typeof DRAFT_REWRITE_REASONS)[number]
export type DraftInteractionRiskFlagType = (typeof DRAFT_RISK_FLAG_TYPES)[number]
export type DraftInteractionTimeContext = (typeof DRAFT_TIME_CONTEXTS)[number]
export type DraftInteractionWorkflowType = (typeof DRAFT_WORKFLOW_TYPES)[number]
export type DraftInteractionReactionPrediction = (typeof DRAFT_REACTION_PREDICTIONS)[number]
export type DraftInteractionRegion = (typeof DRAFT_REGIONS)[number]
export type DraftInteractionTeacherIntent = (typeof DRAFT_TEACHER_INTENTS)[number]

export interface DraftInteractionEventPayload {
  event_name: DraftInteractionEventName
  message_context: DraftInteractionMessageContext
  rewrite_reason?: DraftInteractionRewriteReason | null
  risk_flag?: DraftInteractionRiskFlagType | null
  edit_depth: number
  time_context: DraftInteractionTimeContext
  workflow_type: DraftInteractionWorkflowType
  reaction_prediction?: DraftInteractionReactionPrediction | null
  region?: DraftInteractionRegion | null
  teacher_intent?: DraftInteractionTeacherIntent | null
  timestamp: string
}

export interface DraftInteractionEventRecord extends DraftInteractionEventPayload {
  schema_name: typeof DRAFT_INTERACTION_SCHEMA_NAME
  schema_version: typeof DRAFT_INTERACTION_SCHEMA_VERSION
  source: "draft"
}

type DraftInteractionEventInput = Partial<DraftInteractionEventPayload> & {
  event_type?: unknown
  observed_at?: unknown
  risk_flag_type?: unknown
}

const EU_REGION_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
])

function parseEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  return typeof value === "string" && allowed.includes(value as T[number])
    ? (value as T[number])
    : null
}

function sanitizeEditDepth(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.max(0, Math.round(value))
}

export function inferTimeContext(date = new Date()): DraftInteractionTimeContext {
  const day = date.getDay()
  if (day === 0 || day === 6) {
    return "weekend"
  }

  const hour = date.getHours()
  return hour >= 7 && hour < 18 ? "school_hours" : "after_hours"
}

export function inferRegionFromLocale(locale?: string | null): DraftInteractionRegion | null {
  if (!locale) {
    return null
  }

  const regionCode = locale.split("-")[1]?.toUpperCase()
  if (!regionCode) {
    return null
  }

  if (regionCode === "GB" || regionCode === "UK") {
    return "UK"
  }

  if (regionCode === "US") {
    return "US"
  }

  if (EU_REGION_CODES.has(regionCode)) {
    return "EU"
  }

  return "other"
}

export function inferDraftMessageContext(
  mode: DraftMode,
  documentationMode = false,
): DraftInteractionMessageContext {
  if (documentationMode) {
    return "incident_record"
  }

  return mode === "report_comment" ? "report_comment" : "parent_email"
}

export function inferDraftWorkflowType(options: {
  rewrite?: boolean
  documentationMode?: boolean
  toneAdjustment?: boolean
}): DraftInteractionWorkflowType {
  if (options.documentationMode) {
    return "documentation_mode"
  }

  if (options.toneAdjustment) {
    return "tone_adjustment"
  }

  if (options.rewrite) {
    return "rewrite_existing"
  }

  return "new_message"
}

export function inferReactionPrediction(
  forecast?: ReactionForecast | null,
): DraftInteractionReactionPrediction | null {
  if (!forecast) {
    return null
  }

  const ordered = Object.entries(forecast).sort(([, left], [, right]) => right - left)
  const topReaction = ordered[0]?.[0]

  switch (topReaction) {
    case "hostile":
      return "angry"
    case "defensive":
      return "defensive"
    case "confused":
      return "confused"
    case "collaborative":
    case "concerned":
      return "calm"
    default:
      return null
  }
}

function mapSignalCategoryToRiskFlagType(category?: string | null): DraftInteractionRiskFlagType | null {
  switch (category) {
    case "escalation":
      return "escalation_language"
    case "accusation":
    case "negative_generalisation":
    case "prescriptive_demand":
      return "accusation_language"
    case "frustration":
    case "emotional_coldness":
      return "emotional_language"
    case "professional_risk":
      return "unclear_documentation"
    default:
      return null
  }
}

export function inferRiskFlagTypes(
  safetyAnalysis?: Pick<SafetyEngineOutput, "triggeredSignals" | "professionalRiskFlags"> | null,
): DraftInteractionRiskFlagType[] {
  if (!safetyAnalysis) {
    return []
  }

  const riskTypes = new Set<DraftInteractionRiskFlagType>()

  for (const signal of safetyAnalysis.triggeredSignals ?? []) {
    const mappedRisk = mapSignalCategoryToRiskFlagType(signal.category)
    if (mappedRisk) {
      riskTypes.add(mappedRisk)
    }
  }

  if ((safetyAnalysis.professionalRiskFlags?.length ?? 0) > 0) {
    riskTypes.add("unclear_documentation")
  }

  return Array.from(riskTypes)
}

export function inferRewriteReason(options: {
  deescalationSummary?: DeescalationSummary | null
  safetyAnalysis?: Pick<SafetyEngineOutput, "triggeredSignals" | "professionalRiskFlags"> | null
  documentationMode?: boolean
  inputReframed?: boolean
}): DraftInteractionRewriteReason | null {
  if (options.documentationMode) {
    return "documentation_precision"
  }

  if ((options.safetyAnalysis?.professionalRiskFlags?.length ?? 0) > 0) {
    return "professionalism"
  }

  if (
    (options.safetyAnalysis?.triggeredSignals ?? []).some(
      (signal) => signal.category === "escalation",
    )
  ) {
    return "escalation_risk"
  }

  if (options.deescalationSummary?.wasDeescalated) {
    return "tone_softening"
  }

  if (options.inputReframed) {
    return "clarity"
  }

  return null
}

export function buildDraftInteractionEventPayload(
  input: DraftInteractionEventInput,
): DraftInteractionEventPayload | null {
  const eventName = parseEnum(input.event_name ?? input.event_type, DRAFT_EVENT_NAMES)
  const messageContext = parseEnum(input.message_context, DRAFT_MESSAGE_CONTEXTS)
  const timeContext = parseEnum(input.time_context, DRAFT_TIME_CONTEXTS)
  const workflowType = parseEnum(input.workflow_type, DRAFT_WORKFLOW_TYPES)

  if (!eventName || !messageContext || !timeContext || !workflowType) {
    return null
  }

  const timestampCandidate = input.timestamp ?? input.observed_at

  return {
    event_name: eventName,
    message_context: messageContext,
    rewrite_reason: parseEnum(input.rewrite_reason, DRAFT_REWRITE_REASONS),
    risk_flag: parseEnum(input.risk_flag ?? input.risk_flag_type, DRAFT_RISK_FLAG_TYPES),
    edit_depth: sanitizeEditDepth(input.edit_depth),
    time_context: timeContext,
    workflow_type: workflowType,
    reaction_prediction: parseEnum(input.reaction_prediction, DRAFT_REACTION_PREDICTIONS),
    region: parseEnum(input.region, DRAFT_REGIONS),
    teacher_intent: parseEnum(input.teacher_intent, DRAFT_TEACHER_INTENTS),
    timestamp:
      typeof timestampCandidate === "string" && timestampCandidate
        ? timestampCandidate
        : new Date().toISOString(),
  }
}

export function buildDraftInteractionEventRecord(
  input: DraftInteractionEventInput,
): DraftInteractionEventRecord | null {
  const payload = buildDraftInteractionEventPayload(input)

  if (!payload) {
    return null
  }

  return {
    schema_name: DRAFT_INTERACTION_SCHEMA_NAME,
    schema_version: DRAFT_INTERACTION_SCHEMA_VERSION,
    source: "draft",
    ...payload,
  }
}
