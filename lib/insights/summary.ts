import {
  ensureTeacherCommunicationLoadWeekCoverage,
  buildTeacherCommunicationLoadSummary,
  buildTeacherCommunicationLoadWeeklyMetricsFromEvents,
  type TeacherCommunicationLoadWeeklyMetrics,
} from "@/lib/insights/teacher-communication-load"
import type {
  DraftInteractionEventRecord,
  DraftInteractionMessageContext,
  DraftInteractionTeacherIntent,
} from "@/lib/draft-interaction-events"

export type WeeklyReflection = {
  key: string
  values?: Record<string, string | number>
}

export type InsightsSummary = {
  dataSource?: "events" | "snippets" | "usage_fallback" | "empty"
  timeSaved?: {
    hours?: number
    minutes?: number
    trend?: number
    trendDirection?: "up" | "down"
    contextCount?: number
  }
  draftsCreated?: {
    total?: number
    usedWithoutEdits?: number
    percentage?: number
  }
  currentStreak?: {
    days?: number
  }
  qualityScore?: {
    score?: number
    trend?: number
  }
  communicationLoad?: {
    score?: number
    trend?: number
    trendDirection?: "up" | "down"
    improvementIndicator?: "improving" | "stable" | "rising"
    fourWeekTrend?: number[]
      currentWeek?: TeacherCommunicationLoadWeeklyMetrics
      previousWeek?: TeacherCommunicationLoadWeeklyMetrics
  }
  weeklyReflection?: WeeklyReflection | null
  updatedAt?: string | null
}

export type InsightSnippetRecord = {
  createdAt?: unknown
}

export type InsightEventRecord = Partial<DraftInteractionEventRecord>

const ALLOWED_RANGE_DAYS = new Set([7, 30, 90])
const DEFAULT_RANGE_DAYS = 30
const MINUTES_SAVED_PER_DRAFT = 3

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function parseIsoDate(value?: unknown) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const parsed = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const parsed = new Date((value as { seconds: number }).seconds * 1000)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getEventTimestamp(event: InsightEventRecord) {
  return parseIsoDate(event.timestamp)
}

function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function countEventsByName(events: InsightEventRecord[], eventName: string) {
  return events.filter((event) => event.event_name === eventName).length
}

function countDraftEventsByTimeContext(
  events: InsightEventRecord[],
  timeContext: DraftInteractionEventRecord["time_context"],
) {
  return events.filter(
    (event) => event.event_name === "draft_created" && event.time_context === timeContext,
  ).length
}

function countDraftEventsByMessageContexts(
  events: InsightEventRecord[],
  contexts: DraftInteractionMessageContext[],
) {
  return events.filter(
    (event) =>
      event.event_name === "draft_created" &&
      typeof event.message_context === "string" &&
      contexts.includes(event.message_context as DraftInteractionMessageContext),
  ).length
}

function countEventsByTeacherIntents(
  events: InsightEventRecord[],
  intents: DraftInteractionTeacherIntent[],
) {
  return events.filter(
    (event) =>
      typeof event.teacher_intent === "string" &&
      intents.includes(event.teacher_intent as DraftInteractionTeacherIntent),
  ).length
}

export function buildWeeklyReflection(events: InsightEventRecord[]): WeeklyReflection | null {
  const draftsCreated = countEventsByName(events, "draft_created")
  const rewriteAccepted = countEventsByName(events, "rewrite_accepted")
  const riskFlagsTriggered = countEventsByName(events, "risk_flag_triggered")
  const documentationModeUsage =
    countEventsByName(events, "documentation_mode_enabled") +
    events.filter(
      (event) =>
        event.event_name === "draft_created" &&
        event.workflow_type === "documentation_mode",
    ).length
  const afterHoursDrafts = countDraftEventsByTimeContext(events, "after_hours")
  const weekendDrafts = countDraftEventsByTimeContext(events, "weekend")
  const schoolHoursDrafts = countDraftEventsByTimeContext(events, "school_hours")
  const outOfHoursDrafts = afterHoursDrafts + weekendDrafts
  const behaviourFocusedDrafts =
    countEventsByTeacherIntents(events, ["address_behaviour", "document_incident"]) +
    countDraftEventsByMessageContexts(events, [
      "behaviour_note",
      "incident_record",
      "safeguarding_note",
    ])
  const progressFocusedDrafts =
    countEventsByTeacherIntents(events, ["share_progress", "praise_student"]) +
    countDraftEventsByMessageContexts(events, ["report_comment", "student_feedback"])
  const parentMessageDrafts = countDraftEventsByMessageContexts(events, ["parent_email"])
  const complaintFocusedDrafts = countEventsByTeacherIntents(events, ["respond_to_complaint"])
  const expectationsFocusedDrafts = countEventsByTeacherIntents(events, [
    "clarify_expectations",
  ])
  const signalCount =
    draftsCreated +
    rewriteAccepted +
    riskFlagsTriggered +
    documentationModeUsage +
    afterHoursDrafts +
    weekendDrafts +
    behaviourFocusedDrafts +
    progressFocusedDrafts +
    complaintFocusedDrafts +
    expectationsFocusedDrafts

  if (signalCount === 0) {
    return null
  }

  if (documentationModeUsage > 0) {
    return { key: "insights.weeklyReflection.documentation" }
  }

  if (behaviourFocusedDrafts >= 1 && (rewriteAccepted >= 1 || riskFlagsTriggered >= 1)) {
    return { key: "insights.weeklyReflection.behaviourTone" }
  }

  if (rewriteAccepted >= 1 && riskFlagsTriggered >= 1) {
    return { key: "insights.weeklyReflection.softening" }
  }

  if (complaintFocusedDrafts >= 1) {
    return { key: "insights.weeklyReflection.complaints" }
  }

  if (expectationsFocusedDrafts >= 1) {
    return { key: "insights.weeklyReflection.expectations" }
  }

  if (
    parentMessageDrafts >= 1 &&
    schoolHoursDrafts >= Math.max(1, outOfHoursDrafts + 1) &&
    outOfHoursDrafts <= 1
  ) {
    return { key: "insights.weeklyReflection.schoolHours" }
  }

  if (progressFocusedDrafts >= 1) {
    return { key: "insights.weeklyReflection.progress" }
  }

  return { key: "insights.weeklyReflection.general" }
}

export function normalizeInsightsRangeDays(rawValue: string | null | undefined) {
  const parsed = Number(rawValue)
  return ALLOWED_RANGE_DAYS.has(parsed) ? parsed : DEFAULT_RANGE_DAYS
}

export function hasMeaningfulInsights(summary: InsightsSummary | null | undefined) {
  const timeSavedValue = summary?.timeSaved?.hours ?? summary?.timeSaved?.minutes ?? 0

  return Boolean(
    timeSavedValue ||
      summary?.draftsCreated?.total ||
      summary?.currentStreak?.days ||
      summary?.qualityScore?.score ||
      summary?.communicationLoad?.score,
  )
}

export function buildFallbackInsightsSummary(
  draftCount: number,
  updatedAt: string | null = null,
): InsightsSummary {
  const minutes = draftCount * MINUTES_SAVED_PER_DRAFT
  const communicationLoad = buildTeacherCommunicationLoadSummary([])
  return {
    dataSource: draftCount > 0 ? "usage_fallback" : "empty",
    draftsCreated: {
      total: draftCount,
      usedWithoutEdits: 0,
      percentage: 0,
    },
    timeSaved: {
      minutes,
      hours: roundToSingleDecimal(minutes / 60),
      trend: 0,
      trendDirection: "up",
      contextCount: draftCount,
    },
    currentStreak: { days: 0 },
    qualityScore: { score: 0, trend: 0 },
    communicationLoad: {
      score: communicationLoad.score,
      trend: communicationLoad.trend,
      trendDirection: communicationLoad.trendDirection,
      improvementIndicator: communicationLoad.improvementIndicator,
      fourWeekTrend: communicationLoad.fourWeekTrend,
      currentWeek: communicationLoad.currentWeek,
      previousWeek: communicationLoad.previousWeek,
    },
    weeklyReflection: null,
    updatedAt,
  }
}

function getSummaryDraftCount(summary?: InsightsSummary | null) {
  return summary?.draftsCreated?.total ?? 0
}

function getSummaryTimeSaved(summary?: InsightsSummary | null) {
  return summary?.timeSaved?.minutes ?? summary?.timeSaved?.hours ?? 0
}

export function mergeInsightsSummaries(
  eventSummary: InsightsSummary,
  snippetSummary?: InsightsSummary | null,
): InsightsSummary {
  if (!snippetSummary) {
    return eventSummary
  }

  const eventDraftCount = getSummaryDraftCount(eventSummary)
  const snippetDraftCount = getSummaryDraftCount(snippetSummary)
  const usageSummary =
    snippetDraftCount > eventDraftCount ||
    (snippetDraftCount === eventDraftCount &&
      getSummaryTimeSaved(snippetSummary) > getSummaryTimeSaved(eventSummary))
      ? snippetSummary
      : eventSummary

  return {
    ...eventSummary,
    dataSource: eventDraftCount > 0 ? eventSummary.dataSource : usageSummary.dataSource ?? eventSummary.dataSource,
    draftsCreated: usageSummary.draftsCreated ?? eventSummary.draftsCreated,
    timeSaved: usageSummary.timeSaved ?? eventSummary.timeSaved,
    currentStreak: usageSummary.currentStreak ?? eventSummary.currentStreak,
    qualityScore:
      eventDraftCount > 0
        ? eventSummary.qualityScore
        : usageSummary.qualityScore ?? eventSummary.qualityScore,
    updatedAt: eventSummary.updatedAt ?? usageSummary.updatedAt ?? null,
  }
}

function countDraftCreatedEvents(events: InsightEventRecord[]) {
  return events.filter((event) => event.event_name === "draft_created").length
}

function countDraftModificationEvents(events: InsightEventRecord[]) {
  return events.filter((event) =>
    event.event_name === "draft_modified" ||
    event.event_name === "rewrite_modified" ||
    event.event_name === "edit_action",
  ).length
}

function calculateDraftQualityScore(events: InsightEventRecord[]) {
  const totalDrafts = countDraftCreatedEvents(events)
  if (totalDrafts === 0) {
    return 0
  }

  const modifiedDrafts = Math.min(totalDrafts, countDraftModificationEvents(events))
  const usedWithoutEdits = Math.max(totalDrafts - modifiedDrafts, 0)
  return Math.round((usedWithoutEdits / totalDrafts) * 100)
}

export function buildInsightsSummaryFromEvents(
  currentEvents: InsightEventRecord[],
  previousEvents: InsightEventRecord[] = [],
  recentEvents: InsightEventRecord[] = [],
  weeklyEvents: InsightEventRecord[] = currentEvents,
): InsightsSummary {
  const currentDates = currentEvents
    .map((event) => getEventTimestamp(event))
    .filter((value): value is Date => value !== null)
    .sort((a, b) => b.getTime() - a.getTime())
  const currentDraftsCreated = countDraftCreatedEvents(currentEvents)
  const previousDraftsCreated = countDraftCreatedEvents(previousEvents)
  const currentModifiedDrafts = Math.min(
    currentDraftsCreated,
    countDraftModificationEvents(currentEvents),
  )
  const usedWithoutEdits = Math.max(currentDraftsCreated - currentModifiedDrafts, 0)
  const usedWithoutEditsRatio =
    currentDraftsCreated > 0 ? usedWithoutEdits / currentDraftsCreated : 0
  const minutes = currentDraftsCreated * MINUTES_SAVED_PER_DRAFT
  const streak = getCurrentStreakDays(currentDates)
  const trend =
    previousDraftsCreated > 0
      ? Math.round(((currentDraftsCreated - previousDraftsCreated) / previousDraftsCreated) * 100)
      : currentDraftsCreated > 0
        ? 100
        : 0
  const qualityScore = calculateDraftQualityScore(currentEvents)
  const previousQualityScore = calculateDraftQualityScore(previousEvents)
  const communicationLoad = buildTeacherCommunicationLoadSummary(
    ensureTeacherCommunicationLoadWeekCoverage(
      buildTeacherCommunicationLoadWeeklyMetricsFromEvents(recentEvents),
    ),
  )
  const weeklyReflection = buildWeeklyReflection(weeklyEvents)

  return {
    dataSource: currentDraftsCreated > 0 ? "events" : weeklyReflection ? "events" : "empty",
    draftsCreated: {
      total: currentDraftsCreated,
      usedWithoutEdits,
      percentage: usedWithoutEditsRatio,
    },
    timeSaved: {
      minutes,
      hours: roundToSingleDecimal(minutes / 60),
      trend,
      trendDirection: trend < 0 ? "down" : "up",
      contextCount: currentDraftsCreated,
    },
    currentStreak: { days: streak },
    qualityScore: {
      score: qualityScore,
      trend: qualityScore - previousQualityScore,
    },
    communicationLoad: {
      score: communicationLoad.score,
      trend: communicationLoad.trend,
      trendDirection: communicationLoad.trendDirection,
      improvementIndicator: communicationLoad.improvementIndicator,
      fourWeekTrend: communicationLoad.fourWeekTrend,
      currentWeek: communicationLoad.currentWeek,
      previousWeek: communicationLoad.previousWeek,
    },
    weeklyReflection,
    updatedAt: currentDates[0]?.toISOString() ?? null,
  }
}

export function buildInsightsSummaryFromSnippets(
  currentSnippets: InsightSnippetRecord[],
  previousSnippets: InsightSnippetRecord[] = [],
  weeklyMetrics: Array<Partial<TeacherCommunicationLoadWeeklyMetrics>> = [],
): InsightsSummary {
  const currentDates = currentSnippets
    .map((snippet) => parseIsoDate(snippet.createdAt))
    .filter((value): value is Date => value !== null)
    .sort((a, b) => b.getTime() - a.getTime())

  const previousCount = previousSnippets
    .map((snippet) => parseIsoDate(snippet.createdAt))
    .filter((value): value is Date => value !== null).length

  const total = currentDates.length
  const minutes = total * MINUTES_SAVED_PER_DRAFT
  const streak = getCurrentStreakDays(currentDates)
  const trend =
    previousCount > 0
      ? Math.round(((total - previousCount) / previousCount) * 100)
      : total > 0
        ? 100
        : 0
  const communicationLoad = buildTeacherCommunicationLoadSummary(weeklyMetrics)

  return {
    dataSource: total > 0 ? "snippets" : "empty",
    draftsCreated: {
      total,
      usedWithoutEdits: 0,
      percentage: 0,
    },
    timeSaved: {
      minutes,
      hours: roundToSingleDecimal(minutes / 60),
      trend,
      trendDirection: trend < 0 ? "down" : "up",
      contextCount: total,
    },
    currentStreak: { days: streak },
    qualityScore: { score: 0, trend: 0 },
    communicationLoad: {
      score: communicationLoad.score,
      trend: communicationLoad.trend,
      trendDirection: communicationLoad.trendDirection,
      improvementIndicator: communicationLoad.improvementIndicator,
      fourWeekTrend: communicationLoad.fourWeekTrend,
      currentWeek: communicationLoad.currentWeek,
      previousWeek: communicationLoad.previousWeek,
    },
    weeklyReflection: null,
    updatedAt: currentDates[0]?.toISOString() ?? null,
  }
}

function getCurrentStreakDays(sortedDates: Date[]) {
  if (!sortedDates.length) {
    return 0
  }

  const uniqueDayKeys = Array.from(new Set(sortedDates.map(toUtcDayKey)))
  let streak = 1

  for (let index = 1; index < uniqueDayKeys.length; index += 1) {
    const previous = new Date(`${uniqueDayKeys[index - 1]}T00:00:00.000Z`)
    const current = new Date(`${uniqueDayKeys[index]}T00:00:00.000Z`)
    const differenceInDays = Math.round((previous.getTime() - current.getTime()) / 86_400_000)

    if (differenceInDays !== 1) {
      break
    }

    streak += 1
  }

  return streak
}
