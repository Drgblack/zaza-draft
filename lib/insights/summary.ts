export type InsightsSummary = {
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
  updatedAt?: string | null
}

export type InsightSnippetRecord = {
  createdAt?: string | null
}

const ALLOWED_RANGE_DAYS = new Set([7, 30, 90])
const DEFAULT_RANGE_DAYS = 30
const MINUTES_SAVED_PER_DRAFT = 3

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function parseIsoDate(value?: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
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
      summary?.qualityScore?.score,
  )
}

export function buildFallbackInsightsSummary(
  draftCount: number,
  updatedAt: string | null = null,
): InsightsSummary {
  const minutes = draftCount * MINUTES_SAVED_PER_DRAFT
  return {
    draftsCreated: {
      total: draftCount,
      usedWithoutEdits: 0,
      percentage: draftCount,
    },
    timeSaved: {
      minutes,
      hours: roundToSingleDecimal(minutes / 60),
      trend: 0,
      trendDirection: "up",
      contextCount: draftCount,
    },
    currentStreak: { days: draftCount > 0 ? 1 : 0 },
    qualityScore: { score: 0, trend: 0 },
    updatedAt,
  }
}

export function buildInsightsSummaryFromSnippets(
  currentSnippets: InsightSnippetRecord[],
  previousSnippets: InsightSnippetRecord[] = [],
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

  return {
    draftsCreated: {
      total,
      usedWithoutEdits: 0,
      percentage: total,
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
