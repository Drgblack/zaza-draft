import type { DraftInteractionEventRecord } from "@/lib/draft-interaction-events"
import {
  DRAFT_REACTION_PREDICTIONS,
  type DraftInteractionReactionPrediction,
} from "@/lib/draft-interaction-events"
import {
  calculateTeacherCommunicationLoad,
  getWeekEndIso,
  getWeekStartIso,
} from "@/lib/insights/teacher-communication-load"

export interface ReactionPredictionCounts {
  calm: number
  confused: number
  defensive: number
  angry: number
}

export interface TeacherAnalyticsWeeklyMetrics {
  teacher_hash: string
  school_hash?: string | null
  week_start: string
  week_end: string
  drafts_created: number
  rewrites: number
  risk_flags_triggered: number
  after_hours_drafts: number
  weekend_drafts: number
  documentation_mode_usage: number
  edit_depth_total: number
  teacher_communication_load: number
  updated_at?: string | null
}

export interface SchoolAnalyticsWeeklyMetrics {
  school_hash: string
  week_start: string
  week_end: string
  draft_count: number
  rewrite_count: number
  risk_flags_triggered: number
  after_hours_messages: number
  weekend_messages: number
  documentation_mode_usage: number
  reaction_prediction_counts: ReactionPredictionCounts
  teacher_communication_load_total: number
  updated_at?: string | null
}

function createEmptyReactionPredictionCounts(): ReactionPredictionCounts {
  return {
    calm: 0,
    confused: 0,
    defensive: 0,
    angry: 0,
  }
}

function buildReactionPredictionCounts(
  eventName?: DraftInteractionEventRecord["event_name"],
  reactionPrediction?: DraftInteractionReactionPrediction | null,
) {
  const counts = createEmptyReactionPredictionCounts()
  if (
    eventName === "reaction_prediction_generated" &&
    reactionPrediction &&
    DRAFT_REACTION_PREDICTIONS.includes(reactionPrediction)
  ) {
    counts[reactionPrediction] = 1
  }
  return counts
}

function deriveBaseWeeklySignals(event: DraftInteractionEventRecord) {
  const draftsCreated = event.event_name === "draft_created" ? 1 : 0
  const rewrites = event.event_name === "rewrite_accepted" ? 1 : 0
  const riskFlagsTriggered = event.event_name === "risk_flag_triggered" ? 1 : 0
  const afterHoursDrafts =
    event.event_name === "draft_created" && event.time_context === "after_hours" ? 1 : 0
  const weekendDrafts =
    event.event_name === "draft_created" && event.time_context === "weekend" ? 1 : 0
  const documentationModeUsage =
    event.event_name === "documentation_mode_enabled" ||
    (event.event_name === "draft_created" && event.workflow_type === "documentation_mode")
      ? 1
      : 0

  return {
    drafts_created: draftsCreated,
    rewrites,
    risk_flags_triggered: riskFlagsTriggered,
    after_hours_drafts: afterHoursDrafts,
    weekend_drafts: weekendDrafts,
    documentation_mode_usage: documentationModeUsage,
  }
}

export function buildTeacherAnalyticsWeeklyDelta(
  event: DraftInteractionEventRecord,
  identifiers: { teacher_hash: string; school_hash?: string | null },
) {
  const weekStartIso = getWeekStartIso(event.timestamp)
  const baseSignals = deriveBaseWeeklySignals(event)

  return {
    weekStartIso,
    metrics: {
      teacher_hash: identifiers.teacher_hash,
      school_hash: identifiers.school_hash ?? null,
      week_start: weekStartIso,
      week_end: getWeekEndIso(weekStartIso),
      ...baseSignals,
      edit_depth_total: event.edit_depth ?? 0,
      teacher_communication_load: calculateTeacherCommunicationLoad({
        drafts_created: baseSignals.drafts_created,
        rewrites: baseSignals.rewrites,
        risk_flags_triggered: baseSignals.risk_flags_triggered,
        after_hours_drafts: baseSignals.after_hours_drafts,
        weekend_drafts: baseSignals.weekend_drafts,
      }),
    } satisfies TeacherAnalyticsWeeklyMetrics,
  }
}

export function buildSchoolAnalyticsWeeklyDelta(
  event: DraftInteractionEventRecord,
  schoolHash: string,
) {
  const weekStartIso = getWeekStartIso(event.timestamp)
  const baseSignals = deriveBaseWeeklySignals(event)

  return {
    weekStartIso,
    metrics: {
      school_hash: schoolHash,
      week_start: weekStartIso,
      week_end: getWeekEndIso(weekStartIso),
      draft_count: baseSignals.drafts_created,
      rewrite_count: baseSignals.rewrites,
      risk_flags_triggered: baseSignals.risk_flags_triggered,
      after_hours_messages: baseSignals.after_hours_drafts,
      weekend_messages: baseSignals.weekend_drafts,
      documentation_mode_usage: baseSignals.documentation_mode_usage,
      reaction_prediction_counts: buildReactionPredictionCounts(
        event.event_name,
        event.reaction_prediction,
      ),
      teacher_communication_load_total: calculateTeacherCommunicationLoad({
        drafts_created: baseSignals.drafts_created,
        rewrites: baseSignals.rewrites,
        risk_flags_triggered: baseSignals.risk_flags_triggered,
        after_hours_drafts: baseSignals.after_hours_drafts,
        weekend_drafts: baseSignals.weekend_drafts,
      }),
    } satisfies SchoolAnalyticsWeeklyMetrics,
  }
}
