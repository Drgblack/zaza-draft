import type { ZazaSignalType } from "@/lib/analytics/signal-schema"

export type AnalyticsTimeframe = "7" | "30" | "all"

export type UsageSignalRecord = {
  signalId?: string
  signalType?: ZazaSignalType | string
  timestamp?: number
  payload?: Record<string, unknown>
  uidHash?: string
  schoolId?: string
  locale?: string
  appVersion?: string
  sessionId?: string
}

export type AdminAnalyticsSummary = {
  generationOutcomeCounts: {
    generated: number
    fallback: number
    copyEditOnly: number
  }
  generationSuccessRate: number
  fallbackRate: number
  copyEditOnlyRate: number
  avgSendConfidenceScore: number | null
  sendConfidenceDistribution: { high: number; medium: number; low: number }
  qualityVerdictDistribution: {
    already_strong: number
    improved: number
    needs_rewrite: number
  }
  teacherInteractionDistribution: {
    accepted: number
    edited_minor: number
    edited_major: number
    discarded: number
  }
  riskStripDistribution: {
    viewed: number
    ignored: number
    caused_pause: number
    caused_edit: number
  }
  topViolationCategories: Array<{ category: string; count: number }>
  sendConfidenceVsAction: Array<{
    band: "high" | "medium" | "low"
    sentCount: number
    discardedCount: number
  }>
  violationActionCorrelation: {
    withViolations: { accepted: number; edited: number; discarded: number }
    withoutViolations: { accepted: number; edited: number; discarded: number }
  }
  totalSignals: number
  periodDays: number | "all"
}

export type ProductFeedItem = {
  signalType: string
  frequency: number
  productImplication: string
  suggestedAction: string
  priorityScore: number
}

type SessionQualityState = {
  hasViolations: boolean
}

type SessionTeacherAction = "accepted" | "edited" | "discarded" | null

const SEND_CONFIDENCE_BANDS = [
  { key: "high" as const, test: (score: number) => score >= 80 },
  { key: "medium" as const, test: (score: number) => score >= 60 && score < 80 },
  { key: "low" as const, test: (score: number) => score < 60 },
] as const

function roundRate(value: number) {
  return Number(value.toFixed(3))
}

function getBandFromScore(score: number): "high" | "medium" | "low" {
  return SEND_CONFIDENCE_BANDS.find((band) => band.test(score))?.key ?? "low"
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function normalizeAnalyticsTimeframe(value: string | null): AnalyticsTimeframe {
  if (value === "30" || value === "all") {
    return value
  }
  return "7"
}

export function getTimeframeDays(timeframe: AnalyticsTimeframe): number | null {
  if (timeframe === "all") {
    return null
  }
  return Number(timeframe)
}

export function summarizeUsageSignals(
  signals: UsageSignalRecord[],
  timeframe: AnalyticsTimeframe,
): AdminAnalyticsSummary {
  let generatedCount = 0
  let fallbackCount = 0
  let copyEditOnlyCount = 0
  let sendConfidenceSum = 0
  let sendConfidenceCount = 0

  const sendConfidenceDistribution = { high: 0, medium: 0, low: 0 }
  const qualityVerdictDistribution = {
    already_strong: 0,
    improved: 0,
    needs_rewrite: 0,
  }
  const teacherInteractionDistribution = {
    accepted: 0,
    edited_minor: 0,
    edited_major: 0,
    discarded: 0,
  }
  const riskStripDistribution = {
    viewed: 0,
    ignored: 0,
    caused_pause: 0,
    caused_edit: 0,
  }
  const violationCounts = new Map<string, number>()
  const sendConfidenceVsAction = {
    high: { band: "high" as const, sentCount: 0, discardedCount: 0 },
    medium: { band: "medium" as const, sentCount: 0, discardedCount: 0 },
    low: { band: "low" as const, sentCount: 0, discardedCount: 0 },
  }
  const sessionQuality = new Map<string, SessionQualityState>()
  const sessionActions = new Map<string, SessionTeacherAction>()

  for (const signal of signals) {
    const signalType = signal.signalType
    const payload = asObject(signal.payload)

    switch (signalType) {
      case "draft_generated":
        generatedCount += 1
        break
      case "draft_fallback_used":
        fallbackCount += 1
        break
      case "draft_copy_edit_only":
        copyEditOnlyCount += 1
        break
      case "judgement_score_emitted": {
        const sendConfidenceScore = asNumber(payload?.sendConfidenceScore)
        if (sendConfidenceScore !== null) {
          sendConfidenceSum += sendConfidenceScore
          sendConfidenceCount += 1
          sendConfidenceDistribution[getBandFromScore(sendConfidenceScore)] += 1
        }
        break
      }
      case "quality_verdict_emitted": {
        const verdict = asString(payload?.verdict)
        if (
          verdict === "already_strong" ||
          verdict === "improved" ||
          verdict === "needs_rewrite"
        ) {
          qualityVerdictDistribution[verdict] += 1
        }
        const violationCategories = asStringArray(payload?.violationCategories)
        for (const category of violationCategories) {
          violationCounts.set(category, (violationCounts.get(category) ?? 0) + 1)
        }
        if (signal.sessionId) {
          sessionQuality.set(signal.sessionId, {
            hasViolations: violationCategories.length > 0,
          })
        }
        break
      }
      case "draft_accepted":
        teacherInteractionDistribution.accepted += 1
        if (signal.sessionId) {
          sessionActions.set(signal.sessionId, "accepted")
        }
        break
      case "draft_edited_minor":
      case "draft_edited_major":
        teacherInteractionDistribution[signalType === "draft_edited_minor" ? "edited_minor" : "edited_major"] += 1
        if (signal.sessionId) {
          sessionActions.set(signal.sessionId, "edited")
        }
        break
      case "draft_discarded":
        teacherInteractionDistribution.discarded += 1
        if (signal.sessionId) {
          sessionActions.set(signal.sessionId, "discarded")
        }
        break
      case "risk_strip_viewed":
        riskStripDistribution.viewed += 1
        break
      case "risk_strip_ignored":
        riskStripDistribution.ignored += 1
        break
      case "risk_strip_caused_pause":
        riskStripDistribution.caused_pause += 1
        break
      case "risk_strip_caused_edit":
        riskStripDistribution.caused_edit += 1
        break
      case "send_confidence_high_accepted":
      case "send_confidence_medium_accepted":
      case "send_confidence_low_accepted": {
        const scoreBand = asString(payload?.scoreBand)
        if (scoreBand === "high" || scoreBand === "medium" || scoreBand === "low") {
          sendConfidenceVsAction[scoreBand].sentCount += 1
        }
        break
      }
      case "send_confidence_low_discarded":
        sendConfidenceVsAction.low.discardedCount += 1
        break
      default:
        break
    }
  }

  const generationOutcomeTotal = generatedCount + fallbackCount + copyEditOnlyCount
  const violationActionCorrelation = {
    withViolations: { accepted: 0, edited: 0, discarded: 0 },
    withoutViolations: { accepted: 0, edited: 0, discarded: 0 },
  }

  for (const [sessionId, action] of sessionActions) {
    if (!action) {
      continue
    }
    const qualityState = sessionQuality.get(sessionId)
    const bucket = qualityState?.hasViolations
      ? violationActionCorrelation.withViolations
      : violationActionCorrelation.withoutViolations
    if (action === "edited") {
      bucket.edited += 1
    } else {
      bucket[action] += 1
    }
  }

  return {
    generationOutcomeCounts: {
      generated: generatedCount,
      fallback: fallbackCount,
      copyEditOnly: copyEditOnlyCount,
    },
    generationSuccessRate:
      generationOutcomeTotal > 0 ? roundRate(generatedCount / generationOutcomeTotal) : 0,
    fallbackRate: generationOutcomeTotal > 0 ? roundRate(fallbackCount / generationOutcomeTotal) : 0,
    copyEditOnlyRate:
      generationOutcomeTotal > 0 ? roundRate(copyEditOnlyCount / generationOutcomeTotal) : 0,
    avgSendConfidenceScore:
      sendConfidenceCount > 0 ? Math.round(sendConfidenceSum / sendConfidenceCount) : null,
    sendConfidenceDistribution,
    qualityVerdictDistribution,
    teacherInteractionDistribution,
    riskStripDistribution,
    topViolationCategories: Array.from(violationCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([category, count]) => ({ category, count })),
    sendConfidenceVsAction: [
      sendConfidenceVsAction.high,
      sendConfidenceVsAction.medium,
      sendConfidenceVsAction.low,
    ],
    violationActionCorrelation,
    totalSignals: signals.length,
    periodDays: timeframe === "all" ? "all" : Number(timeframe),
  }
}

export function buildProductDevelopmentFeed(
  summary: AdminAnalyticsSummary,
): ProductFeedItem[] {
  const items: ProductFeedItem[] = []
  const totalTeacherInteractions =
    summary.teacherInteractionDistribution.accepted +
    summary.teacherInteractionDistribution.edited_minor +
    summary.teacherInteractionDistribution.edited_major +
    summary.teacherInteractionDistribution.discarded
  const totalRiskSignals =
    summary.riskStripDistribution.viewed +
    summary.riskStripDistribution.ignored +
    summary.riskStripDistribution.caused_pause +
    summary.riskStripDistribution.caused_edit
  const totalVerdicts =
    summary.qualityVerdictDistribution.already_strong +
    summary.qualityVerdictDistribution.improved +
    summary.qualityVerdictDistribution.needs_rewrite
  const lowAccepted = summary.sendConfidenceVsAction.find((entry) => entry.band === "low")?.sentCount ?? 0
  const highAccepted = summary.sendConfidenceVsAction.find((entry) => entry.band === "high")?.sentCount ?? 0
  const editedMajorRate =
    totalTeacherInteractions > 0
      ? summary.teacherInteractionDistribution.edited_major / totalTeacherInteractions
      : 0
  const discardedRate =
    totalTeacherInteractions > 0
      ? summary.teacherInteractionDistribution.discarded / totalTeacherInteractions
      : 0
  const riskIgnoredRate =
    totalRiskSignals > 0 ? summary.riskStripDistribution.ignored / totalRiskSignals : 0
  const riskCausedEditRate =
    totalRiskSignals > 0 ? summary.riskStripDistribution.caused_edit / totalRiskSignals : 0
  const alreadyStrongRate =
    totalVerdicts > 0
      ? summary.qualityVerdictDistribution.already_strong / totalVerdicts
      : 0

  if (highAccepted > 0) {
    items.push({
      signalType: "send_confidence_high_accepted",
      frequency: highAccepted,
      productImplication: "Teachers trust high-confidence outputs",
      suggestedAction: "No action needed — confidence model is working",
      priorityScore: highAccepted * 0.5,
    })
  }

  if (lowAccepted > 0) {
    items.push({
      signalType: "send_confidence_low_accepted",
      frequency: lowAccepted,
      productImplication: "Teachers are sending low-confidence drafts without reviewing",
      suggestedAction: "Consider adding a soft warning before send on low-confidence outputs",
      priorityScore: lowAccepted * 2.5,
    })
  }

  if (editedMajorRate > 0.3) {
    items.push({
      signalType: "draft_edited_major",
      frequency: summary.teacherInteractionDistribution.edited_major,
      productImplication: "Output quality gap — teachers are rewriting substantially",
      suggestedAction:
        "Review most common violation categories and tighten generation constraints",
      priorityScore: summary.teacherInteractionDistribution.edited_major * 3,
    })
  }

  if (riskIgnoredRate > 0.5) {
    items.push({
      signalType: "risk_strip_ignored",
      frequency: summary.riskStripDistribution.ignored,
      productImplication: "Risk Strip is not influencing behaviour",
      suggestedAction:
        "Consider redesign — strip may not be prominent enough or teachers don't understand the scores",
      priorityScore: summary.riskStripDistribution.ignored * 2,
    })
  }

  if (riskCausedEditRate > 0.2) {
    items.push({
      signalType: "risk_strip_caused_edit",
      frequency: summary.riskStripDistribution.caused_edit,
      productImplication: "Risk Strip is changing behaviour positively",
      suggestedAction: "Feature is working — consider A/B test on strip placement",
      priorityScore: summary.riskStripDistribution.caused_edit * 1.5,
    })
  }

  if (summary.fallbackRate > 0.1) {
    items.push({
      signalType: "draft_fallback_used",
      frequency: summary.generationOutcomeCounts.fallback,
      productImplication: "Fallback rate is high — generation quality issue",
      suggestedAction: "Review quality gate thresholds and retry logic",
      priorityScore: summary.generationOutcomeCounts.fallback * 2.5,
    })
  }

  if (alreadyStrongRate > 0.4) {
    items.push({
      signalType: "already_strong",
      frequency: summary.qualityVerdictDistribution.already_strong,
      productImplication: "Many teachers are already writing good drafts",
      suggestedAction: "Consider a lighter-touch mode for confident writers",
      priorityScore: summary.qualityVerdictDistribution.already_strong * 1.5,
    })
  }

  if (discardedRate > 0.25) {
    items.push({
      signalType: "draft_discarded",
      frequency: summary.teacherInteractionDistribution.discarded,
      productImplication: "Teachers are frequently rejecting outputs",
      suggestedAction: "Cross-reference with violation categories to identify root cause",
      priorityScore: summary.teacherInteractionDistribution.discarded * 2,
    })
  }

  return items.sort((left, right) => right.priorityScore - left.priorityScore).slice(0, 20)
}

export function flattenSignalForCsv(signal: UsageSignalRecord): Record<string, string> {
  const payload = asObject(signal.payload) ?? {}
  const flattenedPayload = Object.entries(payload).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      if (Array.isArray(value)) {
        accumulator[`payload.${key}`] = value.join("|")
        return accumulator
      }
      if (value === null || value === undefined) {
        accumulator[`payload.${key}`] = ""
        return accumulator
      }
      accumulator[`payload.${key}`] = String(value)
      return accumulator
    },
    {},
  )

  return {
    signalId: signal.signalId ?? "",
    signalType: String(signal.signalType ?? ""),
    timestamp: String(signal.timestamp ?? ""),
    locale: signal.locale ?? "",
    appVersion: signal.appVersion ?? "",
    sessionId: signal.sessionId ?? "",
    uidHash: signal.uidHash ?? "",
    schoolId: signal.schoolId ?? "",
    ...flattenedPayload,
  }
}

export function buildCsv(signals: UsageSignalRecord[]): string {
  const rows = signals.map(flattenSignalForCsv)
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key))
      return set
    }, new Set<string>([
      "signalId",
      "signalType",
      "timestamp",
      "locale",
      "appVersion",
      "sessionId",
      "uidHash",
      "schoolId",
    ])),
  )

  const escapeValue = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, "\"\"")}"`
    }
    return value
  }

  const csvRows = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header] ?? "")).join(",")),
  ]

  return csvRows.join("\n")
}
