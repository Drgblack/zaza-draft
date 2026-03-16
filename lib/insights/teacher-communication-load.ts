import type { DraftInteractionEventRecord } from "@/lib/draft-interaction-events"

export interface TeacherCommunicationLoadWeeklyMetrics {
  week_start: string
  week_end: string
  teacher_communication_load: number
  drafts_created: number
  rewrites: number
  risk_flags_triggered: number
  after_hours_drafts: number
  weekend_drafts: number
  edit_depth_total: number
  updated_at?: string | null
}

export interface TeacherCommunicationLoadSummary {
  score: number
  trend: number
  trendDirection: "up" | "down"
  improvementIndicator: "improving" | "stable" | "rising"
  fourWeekTrend: number[]
  currentWeek: TeacherCommunicationLoadWeeklyMetrics
  previousWeek: TeacherCommunicationLoadWeeklyMetrics
}

export function getWeekStartIso(rawDate?: string | Date | null) {
  const date = rawDate instanceof Date ? new Date(rawDate) : new Date(rawDate ?? Date.now())
  const utcDay = date.getUTCDay()
  const offsetFromMonday = utcDay === 0 ? 6 : utcDay - 1
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - offsetFromMonday)
  return start.toISOString().slice(0, 10)
}

export function getWeekEndIso(weekStartIso: string) {
  const end = new Date(`${weekStartIso}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  return end.toISOString().slice(0, 10)
}

export function createEmptyTeacherCommunicationLoadWeek(weekStartIso = getWeekStartIso()) {
  return {
    week_start: weekStartIso,
    week_end: getWeekEndIso(weekStartIso),
    teacher_communication_load: 0,
    drafts_created: 0,
    rewrites: 0,
    risk_flags_triggered: 0,
    after_hours_drafts: 0,
    weekend_drafts: 0,
    edit_depth_total: 0,
    updated_at: null,
  } satisfies TeacherCommunicationLoadWeeklyMetrics
}

export function calculateTeacherCommunicationLoad(
  inputs: Pick<
    TeacherCommunicationLoadWeeklyMetrics,
    | "drafts_created"
    | "rewrites"
    | "risk_flags_triggered"
    | "after_hours_drafts"
    | "weekend_drafts"
  >,
) {
  return (
    inputs.drafts_created * 2 +
    inputs.rewrites * 3 +
    inputs.risk_flags_triggered * 5 +
    inputs.after_hours_drafts * 4 +
    inputs.weekend_drafts * 6
  )
}

function getDraftInteractionTimestamp(event: Partial<DraftInteractionEventRecord>) {
  return event.timestamp ?? new Date().toISOString()
}

export function buildTeacherCommunicationLoadMetricDelta(event: DraftInteractionEventRecord) {
  const weekStartIso = getWeekStartIso(getDraftInteractionTimestamp(event))
  const draftsCreated = event.event_name === "draft_created" ? 1 : 0
  const rewrites = event.event_name === "rewrite_accepted" ? 1 : 0
  const riskFlagsTriggered = event.event_name === "risk_flag_triggered" ? 1 : 0
  const afterHoursDrafts =
    event.event_name === "draft_created" && event.time_context === "after_hours" ? 1 : 0
  const weekendDrafts =
    event.event_name === "draft_created" && event.time_context === "weekend" ? 1 : 0
  const editDepthTotal = event.edit_depth ?? 0

  return {
    weekStartIso,
    metrics: {
      week_start: weekStartIso,
      week_end: getWeekEndIso(weekStartIso),
      drafts_created: draftsCreated,
      rewrites,
      risk_flags_triggered: riskFlagsTriggered,
      after_hours_drafts: afterHoursDrafts,
      weekend_drafts: weekendDrafts,
      edit_depth_total: editDepthTotal,
      teacher_communication_load: calculateTeacherCommunicationLoad({
        drafts_created: draftsCreated,
        rewrites,
        risk_flags_triggered: riskFlagsTriggered,
        after_hours_drafts: afterHoursDrafts,
        weekend_drafts: weekendDrafts,
      }),
    },
  }
}

export function buildTeacherCommunicationLoadWeeklyMetricsFromEvents(
  events: Array<Partial<DraftInteractionEventRecord>> = [],
) {
  const weeklyMetrics = new Map<string, TeacherCommunicationLoadWeeklyMetrics>()

  for (const rawEvent of events) {
    if (!rawEvent.event_name || !rawEvent.time_context || !rawEvent.workflow_type) {
      continue
    }

    const delta = buildTeacherCommunicationLoadMetricDelta(rawEvent as DraftInteractionEventRecord)
    const existing =
      weeklyMetrics.get(delta.weekStartIso) ??
      createEmptyTeacherCommunicationLoadWeek(delta.weekStartIso)

    existing.drafts_created += delta.metrics.drafts_created
    existing.rewrites += delta.metrics.rewrites
    existing.risk_flags_triggered += delta.metrics.risk_flags_triggered
    existing.after_hours_drafts += delta.metrics.after_hours_drafts
    existing.weekend_drafts += delta.metrics.weekend_drafts
    existing.edit_depth_total += delta.metrics.edit_depth_total
    existing.teacher_communication_load += delta.metrics.teacher_communication_load
    existing.updated_at = getDraftInteractionTimestamp(rawEvent)

    weeklyMetrics.set(delta.weekStartIso, existing)
  }

  return Array.from(weeklyMetrics.values()).sort((left, right) =>
    right.week_start.localeCompare(left.week_start),
  )
}

export function ensureTeacherCommunicationLoadWeekCoverage(
  weeklyMetrics: Array<Partial<TeacherCommunicationLoadWeeklyMetrics>>,
  referenceDate: string | Date = new Date(),
  weeks = 4,
) {
  const coveredWeeks = new Map<string, TeacherCommunicationLoadWeeklyMetrics>()

  for (const week of weeklyMetrics) {
    const normalizedWeek = toWeeklyMetrics(week)
    coveredWeeks.set(normalizedWeek.week_start, normalizedWeek)
  }

  const currentWeekStart = getWeekStartIso(referenceDate)

  for (let offset = 0; offset < weeks; offset += 1) {
    const weekStartDate = new Date(`${currentWeekStart}T00:00:00.000Z`)
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - offset * 7)
    const weekStartIso = getWeekStartIso(weekStartDate)

    if (!coveredWeeks.has(weekStartIso)) {
      coveredWeeks.set(weekStartIso, createEmptyTeacherCommunicationLoadWeek(weekStartIso))
    }
  }

  return Array.from(coveredWeeks.values()).sort((left, right) =>
    right.week_start.localeCompare(left.week_start),
  )
}

function toWeeklyMetrics(value: Partial<TeacherCommunicationLoadWeeklyMetrics> | null | undefined) {
  const weekStartIso = value?.week_start ?? getWeekStartIso()
  return {
    ...createEmptyTeacherCommunicationLoadWeek(weekStartIso),
    ...value,
    week_start: weekStartIso,
    week_end: value?.week_end ?? getWeekEndIso(weekStartIso),
    teacher_communication_load: value?.teacher_communication_load ?? 0,
    drafts_created: value?.drafts_created ?? 0,
    rewrites: value?.rewrites ?? 0,
    risk_flags_triggered: value?.risk_flags_triggered ?? 0,
    after_hours_drafts: value?.after_hours_drafts ?? 0,
    weekend_drafts: value?.weekend_drafts ?? 0,
    edit_depth_total: value?.edit_depth_total ?? 0,
    updated_at: value?.updated_at ?? null,
  } satisfies TeacherCommunicationLoadWeeklyMetrics
}

export function buildTeacherCommunicationLoadSummary(
  weeklyMetrics: Array<Partial<TeacherCommunicationLoadWeeklyMetrics>> = [],
) {
  const sortedWeeks = [...weeklyMetrics]
    .map((week) => toWeeklyMetrics(week))
    .sort((left, right) => right.week_start.localeCompare(left.week_start))

  const currentWeek = sortedWeeks[0] ?? createEmptyTeacherCommunicationLoadWeek()
  const previousWeekStart = new Date(`${currentWeek.week_start}T00:00:00.000Z`)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)
  const previousWeek =
    sortedWeeks[1] ??
    createEmptyTeacherCommunicationLoadWeek(getWeekStartIso(previousWeekStart))
  const currentScore = currentWeek.teacher_communication_load
  const previousScore = previousWeek.teacher_communication_load
  const trend =
    previousScore > 0
      ? Math.round(((currentScore - previousScore) / previousScore) * 100)
      : currentScore > 0
        ? 100
        : 0

  const improvementIndicator =
    trend <= -5 ? "improving" : trend >= 5 ? "rising" : "stable"

  return {
    score: currentScore,
    trend,
    trendDirection: trend <= 0 ? "down" : "up",
    improvementIndicator,
    fourWeekTrend: sortedWeeks.slice(0, 4).reverse().map((week) => week.teacher_communication_load),
    currentWeek,
    previousWeek,
  } satisfies TeacherCommunicationLoadSummary
}
