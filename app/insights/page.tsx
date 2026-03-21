"use client"

import { useMemo, useState, useEffect } from "react"
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Compass,
  Download,
  FileStack,
  Lightbulb,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatCard } from "@/components/insights/stat-card"
import DataControlsExplainer from "@/components/insights/data-controls-explainer"
import FooterSlim from "@/components/FooterSlim"
import Link from "next/link"
import { useLocale } from "@/hooks/use-locale"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useAuth } from "@/hooks/use-auth"
import { useAnalyticsConsent } from "@/hooks/use-analytics-consent"
import { useRouter } from "next/navigation"
import { hasMeaningfulInsights, type InsightsSummary } from "@/lib/insights/summary"
import {
  REMINDER_BUTTON_CLASS,
  buildGoogleCalendarUrl,
  buildIcsEvent,
  getNextWednesdayAt,
  handleGetStarted,
  handleUpdatePreferences,
} from "@/app/insights/suggestion-actions"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"

const REMINDER_EVENT_TITLE = "Protected writing time - Zaza Draft"

type InsightsDisplayState = "starter" | "full"

function isInsightsIndexPreconditionError(
  payload: { error?: { code?: string; message?: string }; emptyReason?: string } | null,
) {
  const code = payload?.error?.code?.toLowerCase() ?? ""
  const message = payload?.error?.message?.toLowerCase() ?? ""

  return (
    payload?.emptyReason === "index_building" ||
    code === "failed-precondition" ||
    message.includes("failed_precondition") ||
    message.includes("requires an index")
  )
}

function getInsightsDisplayState(summary: InsightsSummary | null): InsightsDisplayState {
  const draftCount = summary?.draftsCreated?.total ?? 0
  const hasWeeklyReflection = Boolean(summary?.weeklyReflection)
  const communicationTrendPoints =
    summary?.communicationLoad?.fourWeekTrend?.filter((value) => value > 0).length ?? 0

  if (draftCount >= 3 || hasWeeklyReflection || communicationTrendPoints >= 2) {
    return "full"
  }

  return "starter"
}

export default function InsightsPage() {
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30")
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [insightsSummary, setInsightsSummary] = useState<InsightsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const { locale, t } = useLocale()
  const { prefs } = useTeacherPrefs()
  const { user, status } = useAuth()
  const { analyticsConsent, setAnalyticsConsent } = useAnalyticsConsent()
  const router = useRouter()
  const isAuthenticated = status === "authenticated" && Boolean(user?.uid)

  useEffect(() => {
    let active = true
    if (!isAuthenticated || !user) {
      setInsightsSummary(null)
      setSummaryLoading(false)
      setSummaryError(null)
      return
    }

    const fetchSummary = async () => {
      setSummaryLoading(true)
      try {
        const token = await user.getIdToken()
        if (!token) {
          throw new Error("Missing auth token")
        }
        const response = await fetch(`/api/insights/summary?rangeDays=${dateRange}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
        const payload = await response.json().catch(() => null)
        if (!active) return
        if (response.ok && payload?.success) {
          setInsightsSummary(payload.summary ?? null)
          setSummaryError(null)
        } else if (isInsightsIndexPreconditionError(payload)) {
          console.info("[insights] summary unavailable while indexes build", payload?.error)
          setInsightsSummary(null)
          setSummaryError(null)
        } else if (response.status === 404 || payload?.error?.code === "INSIGHTS_NOT_FOUND") {
          console.info("[insights] empty summary", response.status, payload?.error)
          setInsightsSummary(null)
          setSummaryError(null)
        } else {
          console.warn("[insights] summary error", response.status, payload?.error)
          setInsightsSummary(null)
          setSummaryError(payload?.error?.message || "Unable to load insights.")
        }
      } catch (error) {
        console.error("[insights] failed to load summary", error)
        if (!active) return
        setInsightsSummary(null)
        setSummaryError("Unable to load insights.")
      } finally {
        if (active) {
          setSummaryLoading(false)
        }
      }
    }

    fetchSummary()

    return () => {
      active = false
    }
    }, [dateRange, isAuthenticated, user])

  const teacherName = user?.displayName ?? prefs.firstName
  const hasTeacherName = Boolean(teacherName?.trim())
  const insightsHeading = hasTeacherName
    ? t("insights.title", { name: teacherName })
    : t("insights.titleNoName")
  const summaryTimeSaved = insightsSummary?.timeSaved
  const summaryDrafts = insightsSummary?.draftsCreated
  const summaryStreak = insightsSummary?.currentStreak
  const summaryQuality = insightsSummary?.qualityScore
  const summaryCommunicationLoad = insightsSummary?.communicationLoad
  const summaryWeeklyReflection = insightsSummary?.weeklyReflection
  const hasMetrics = hasMeaningfulInsights(insightsSummary)
  const displayState = getInsightsDisplayState(insightsSummary)
  const showStarterState =
    isAuthenticated && !summaryLoading && !summaryError && displayState === "starter"
  const showFullInsights =
    isAuthenticated && !summaryLoading && !summaryError && hasMetrics && displayState === "full"
  const downloadDisabled = !hasMetrics
  const timeSavedHours =
    summaryTimeSaved?.hours ??
    (summaryTimeSaved?.minutes != null ? summaryTimeSaved.minutes / 60 : 0)
  const timeSavedTrend = summaryTimeSaved?.trend ?? 0
  const draftsTotal = summaryDrafts?.total ?? 0
  const draftsUsed = summaryDrafts?.usedWithoutEdits ?? 0
  const timeSavedContextCount = summaryTimeSaved?.contextCount ?? draftsTotal
  const streakDays = summaryStreak?.days ?? 0
  const qualityScoreValue = summaryQuality?.score ?? 0
  const qualityTrendValue = summaryQuality?.trend ?? 0
  const communicationLoadScore = summaryCommunicationLoad?.score ?? 0
  const communicationLoadTrend = summaryCommunicationLoad?.trend ?? 0
  const communicationLoadDirection = summaryCommunicationLoad?.trendDirection ?? "down"
  const communicationLoadSeries = summaryCommunicationLoad?.fourWeekTrend ?? []
  const weeklyReflectionText = summaryWeeklyReflection
    ? t(summaryWeeklyReflection.key as any, summaryWeeklyReflection.values)
    : null
  const preferredTone = prefs.preferredTone?.trim() || null
  const toneGuidanceText = preferredTone
    ? t("insights.starter.toneWithPreference", { tone: preferredTone })
    : t("insights.starter.toneGeneric")
  const starterRecommendation = draftsTotal > 0
    ? t("insights.starter.nextLow")
    : t("insights.starter.nextNew")
  const currentLoadWeek = summaryCommunicationLoad?.currentWeek
  const previousLoadWeek = summaryCommunicationLoad?.previousWeek
  const communicationLoadInsight = useMemo(() => {
    const currentRisk = currentLoadWeek?.risk_flags_triggered ?? 0
    const previousRisk = previousLoadWeek?.risk_flags_triggered ?? 0
    const currentOutOfHours =
      (currentLoadWeek?.after_hours_drafts ?? 0) + (currentLoadWeek?.weekend_drafts ?? 0)
    const previousOutOfHours =
      (previousLoadWeek?.after_hours_drafts ?? 0) + (previousLoadWeek?.weekend_drafts ?? 0)
    const currentSchoolHours = Math.max((currentLoadWeek?.drafts_created ?? 0) - currentOutOfHours, 0)
    const previousSchoolHours = Math.max((previousLoadWeek?.drafts_created ?? 0) - previousOutOfHours, 0)

    if (currentRisk < previousRisk && currentSchoolHours > previousSchoolHours) {
      return t("insights.communicationLoad.context.lowerRiskSchoolHours")
    }

    if (communicationLoadDirection === "down") {
      return t("insights.communicationLoad.context.down")
    }

    if (currentOutOfHours > previousOutOfHours) {
      return t("insights.communicationLoad.context.afterHours")
    }

    if (currentRisk > previousRisk) {
      return t("insights.communicationLoad.context.higherRisk")
    }

    return t("insights.communicationLoad.context.stable")
  }, [communicationLoadDirection, currentLoadWeek, previousLoadWeek, t])
  const usageSummaryText =
    draftsTotal > 0
      ? t("insights.starter.usageCount", { count: draftsTotal })
      : t("insights.starter.usageEmpty")
  const reminderInsight = t("insights.suggestion.wednesday.desc")
  const reminderHint = t("insights.suggestion.reminder.modalHint")
  const reminderFootnote = t("insights.suggestion.reminder.modalFootnote")
  const reminderEvent = useMemo(() => {
    const start = getNextWednesdayAt(15, 30)
    const end = new Date(start.getTime() + 15 * 60 * 1000)

    return { start, end }
  }, [])
  const reminderStart = reminderEvent.start
  const reminderEnd = reminderEvent.end
  const calendarUrl = useMemo(
    () =>
      buildGoogleCalendarUrl({
        title: REMINDER_EVENT_TITLE,
        description: reminderInsight,
        start: reminderStart,
        end: reminderEnd,
      }),
    [reminderInsight, reminderStart, reminderEnd],
  )
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [locale],
  )
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [locale],
  )
  const summaryUpdatedAtLabel = useMemo(() => {
    if (!insightsSummary?.updatedAt) {
      return null
    }

    const parsed = new Date(insightsSummary.updatedAt)
    if (Number.isNaN(parsed.getTime())) {
      return null
    }

    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed)
  }, [insightsSummary?.updatedAt, locale])
  const reminderDateLabel = dateFormatter.format(reminderStart)
  const reminderTimeLabel = `${timeFormatter.format(reminderStart)} - ${timeFormatter.format(
    reminderEnd,
  )}`
  const handleDownloadIcs = () => {
    const payload = buildIcsEvent({
      title: REMINDER_EVENT_TITLE,
      description: reminderInsight,
      start: reminderStart,
      end: reminderEnd,
    })
    const blob = new Blob([payload], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "protected-writing-time.ics"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIsReminderDialogOpen(false)
  }

  const handleDownloadReport = () => {
    if (downloadDisabled || !insightsSummary) {
      return
    }

    const timeSavedLine =
      summaryTimeSaved?.hours != null
        ? `Time saved: ${summaryTimeSaved.hours.toFixed(1)}h`
        : "Time saved: not enough data"
    const draftsPercentage = Math.round((summaryDrafts?.percentage ?? 0) * 100)
    const draftsLine =
      summaryDrafts?.total != null
        ? `Drafts created: ${summaryDrafts.total} (${draftsPercentage}% used without edits)`
        : "Drafts created: not enough data"
    const streakLine =
      summaryStreak?.days != null
        ? `Current streak: ${summaryStreak.days} days`
        : "Current streak: not enough data"
    const qualityLine =
      summaryQuality?.score != null
        ? `Quality score: ${summaryQuality.score} (${summaryQuality.trend ?? 0}% change)`
        : "Quality score: not enough data"
    const communicationLoadLine =
      summaryCommunicationLoad?.score != null
        ? `Communication load: ${summaryCommunicationLoad.score} (${summaryCommunicationLoad.trend ?? 0}% vs last week)`
        : "Communication load: not enough data"
    const weeklyReflectionLine = weeklyReflectionText
      ? `Weekly reflection: ${weeklyReflectionText}`
      : "Weekly reflection: not enough data"
    const ownerLine = teacherName ? `Name: ${teacherName}` : "Name: N/A"

    const reportLines = [
      "Zaza Draft insights",
      ownerLine,
      "",
      timeSavedLine,
      draftsLine,
      streakLine,
      qualityLine,
      communicationLoadLine,
      weeklyReflectionLine,
      "",
      `Wellbeing insights sharing: ${analyticsConsent ? "On" : "Off"}`,
      `Date range: Last ${dateRange} days`,
    ]

    const blob = new Blob([reportLines.join("\n")], {
      type: "text/plain;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "zaza-draft-insights.txt"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-600 to-orange-500 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 via-pink-900/30 to-transparent -z-10" />

      <header className="border-b border-white/10 bg-gradient-to-r from-pink-500/80 via-purple-600/80 to-orange-500/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("insights.backToEditor")}
              </Link>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                {insightsHeading}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
                {t("insights.explainer")}
              </p>
              <p className="text-white/90 mt-1">{t("insights.subtitle")}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-white/80">
                <Shield className="h-3 w-3" />
                <span>{t("insights.dataControl")}</span>
              </div>
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 className="gap-2 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
                 onClick={handleDownloadReport}
                 disabled={downloadDisabled}
               >
                 <Download className="h-4 w-4" />
                 {t("insights.downloadReport")}
               </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mt-4">
            {(["7", "30", "90"] as const).map((days) => (
              <Button
                key={days}
                variant={dateRange === days ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDateRange(days)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  dateRange === days
                    ? "bg-white/20 border border-white/30 text-purple-600 shadow-sm"
                    : "bg-white/10 border border-transparent text-white hover:bg-white/15 hover:border-white/30"
                }`}
              >
                {t(`insights.filter.last${days}` as any)}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="space-y-10">
          {summaryError && (
            <Card className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive-900 dark:border-destructive/30 dark:bg-destructive-900/10 dark:text-destructive-100">
              <p className="text-base font-semibold">{summaryError}</p>
            </Card>
          )}
          {summaryLoading && (
            <Card className="rounded-3xl border border-white/30 bg-white/90 p-6 text-center text-sm text-gray-600 dark:border-white/20 dark:bg-white/10 dark:text-gray-300">
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {t("insights.empty.loading")}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("insights.empty.loadingSubtitle")}
              </p>
            </Card>
          )}
          {!summaryLoading && weeklyReflectionText && (
            <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-2xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-pink-200 to-violet-200 text-2xl shadow-sm dark:from-amber-400/30 dark:via-pink-400/20 dark:to-violet-400/30">
                  ✍️
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/60">
                    {t("insights.weeklyReflection.title")}
                  </p>
                  <p className="text-lg font-semibold leading-relaxed text-gray-900 dark:text-white">
                    {weeklyReflectionText}
                  </p>
                </div>
              </div>
            </Card>
          )}
          {showStarterState && (
            <>
              <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-2xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/60">
                    {t("insights.starter.eyebrow")}
                  </p>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {t("insights.starter.title")}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-white/75">
                    {t("insights.starter.subtitle")}
                  </p>
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.starter.usageTitle")}
                      </h3>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {usageSummaryText}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-white/75">
                        {t("insights.starter.usageHint")}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.starter.toneTitle")}
                      </h3>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {toneGuidanceText}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-white/75">
                        {t("insights.starter.toneHint")}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      <FileStack className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.starter.laterTitle")}
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-white/75">
                        <li>{t("insights.starter.later.one")}</li>
                        <li>{t("insights.starter.later.two")}</li>
                        <li>{t("insights.starter.later.three")}</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.starter.nextTitle")}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-white/75">
                        {starterRecommendation}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
          {showFullInsights && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
                <StatCard
                  title={t("insights.timeSaved.title")}
                  value={t("insights.timeSaved.hours", { hours: timeSavedHours.toFixed(1) })}
                  numericValue={timeSavedHours}
                  subtitle={t("insights.timeSaved.thisWeek")}
                  trend={draftsTotal > 0 ? {
                    value: t("insights.timeSaved.trend", { percent: `${timeSavedTrend}` }),
                    direction: summaryTimeSaved?.trendDirection ?? "up",
                    color: "text-green-600 dark:text-green-400",
                  } : undefined}
                  tooltip={t("insights.timeSaved.tooltip")}
                  contextMessage={t("insights.timeSaved.context", { count: `${timeSavedContextCount}` })}
                />
                <StatCard
                  title={t("insights.draftsCreated.title")}
                  value={t("insights.draftsCreated.value", { count: draftsTotal })}
                  numericValue={draftsTotal}
                  subtitle={t("insights.draftsCreated.subtitle", { used: draftsUsed, total: draftsTotal })}
                  icon={<FileStack className="h-10 w-10 text-violet-500" />}
                  tooltip={t("insights.draftsCreated.tooltip")}
                />
                <StatCard
                  title={t("insights.currentStreak.title")}
                  value={t("insights.currentStreak.days", { count: streakDays })}
                  numericValue={streakDays}
                  subtitle={t("insights.currentStreak.subtitle")}
                  icon={<CalendarDays className="h-10 w-10 text-amber-500" />}
                  gradient="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20"
                  tooltip={t("insights.currentStreak.tooltip")}
                />
                <StatCard
                  title={t("insights.qualityScore.title")}
                  value={t("insights.qualityScore.value", { score: qualityScoreValue })}
                  numericValue={qualityScoreValue}
                  subtitle={t("insights.qualityScore.subtitle")}
                  trend={draftsTotal > 0 ? {
                    value: t("insights.qualityScore.trend", { points: qualityTrendValue }),
                    direction: qualityTrendValue < 0 ? "down" : "up",
                    color: qualityTrendValue < 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400",
                  } : undefined}
                  icon={<Lightbulb className="h-10 w-10 text-fuchsia-500" />}
                  tooltip={t("insights.qualityScore.tooltip")}
                  sparklineData={communicationLoadSeries.length > 0 ? communicationLoadSeries : undefined}
                  sparklineLabel={t("insights.communicationLoad.sparklineLabel")}
                />
                <StatCard
                  title={t("insights.communicationLoad.title")}
                  value={String(communicationLoadScore)}
                  numericValue={communicationLoadScore}
                  subtitle={t("insights.communicationLoad.subtitle")}
                  trend={communicationLoadSeries.some((value) => value > 0) ? {
                    value: t("insights.communicationLoad.trend", {
                      percent: Math.abs(communicationLoadTrend),
                    }),
                    direction: communicationLoadDirection,
                    color:
                      communicationLoadDirection === "down"
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400",
                  } : undefined}
                  icon={<Compass className="h-10 w-10 text-sky-500" />}
                  tooltip={t("insights.communicationLoad.tooltip")}
                  contextMessage={communicationLoadInsight}
                  sparklineData={communicationLoadSeries.some((value) => value > 0) ? communicationLoadSeries : undefined}
                  sparklineLabel={t("insights.communicationLoad.sparklineLabel")}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.detail.snapshotTitle")}
                      </h3>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t("insights.detail.snapshotDrafts", { count: draftsTotal })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-white/75">
                      {summaryUpdatedAtLabel
                        ? t("insights.detail.snapshotUpdated", { date: summaryUpdatedAtLabel })
                        : t("insights.detail.snapshotEmpty")}
                    </p>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.starter.toneTitle")}
                      </h3>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {toneGuidanceText}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-white/75">
                      {t("insights.starter.toneHint")}
                    </p>
                  </div>
                </Card>

                <Card className="rounded-3xl border border-white/30 bg-white/92 p-6 shadow-xl shadow-purple-500/10 backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                        <Compass className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("insights.detail.signalTitle")}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-white/75">
                      {weeklyReflectionText ?? communicationLoadInsight ?? t("insights.detail.signalFallback")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-white/75">
                      {t("insights.detail.qualityHint")}
                    </p>
                  </div>
                </Card>
              </div>
            </>
          )}

        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t("insights.suggestions.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-2xl border border-gray-200 bg-white/95 text-gray-900 shadow-xl transition-all duration-300 hover:shadow-2xl">
              <span className="text-3xl mb-3 block filter drop-shadow-lg">💡</span>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                {t("insights.suggestion.empathetic.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/80 mb-4">
                {t("insights.suggestion.empathetic.desc")}
              </p>
              <Button
                size="sm"
                type="button"
                onClick={() => handleUpdatePreferences(router)}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg"
              >
                {t("insights.suggestion.empathetic.cta")}
              </Button>
            </Card>

            <Card className="p-6 rounded-2xl border border-gray-200 bg-white/95 text-gray-900 shadow-xl transition-all duration-300 hover:shadow-2xl">
              <span className="text-3xl mb-3 block filter drop-shadow-lg">📅</span>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                {t("insights.suggestion.wednesday.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/80 mb-4">{t("insights.suggestion.wednesday.desc")}</p>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsReminderDialogOpen(true)}
                className={REMINDER_BUTTON_CLASS}
              >
                {t("insights.suggestion.wednesday.cta")}
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300 dark:border-purple-400/40 bg-white/85 dark:bg-white/15 backdrop-blur-xl shadow-xl shadow-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl filter drop-shadow-lg">✏️</span>
                <span
                  className="text-xs font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-1 rounded-full shadow-lg animate-pulse"
                  aria-hidden="true"
                >
                  {t("insights.suggestion.badge.new")}
                </span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                {t("insights.suggestion.classBrain.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/80 mb-4">
                {t("insights.suggestion.classBrain.desc")}
              </p>
              <Button
                size="sm"
                type="button"
                onClick={() => handleGetStarted(router)}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30"
              >
                {t("insights.suggestion.classBrain.cta")}
              </Button>
            </Card>
          </div>
        </div>

      </div>

      <div className="mt-10">
        <DataControlsExplainer
          shareData={analyticsConsent}
          onShareDataChange={setAnalyticsConsent}
          onPrivacySettingsClick={() => router.push("/account/privacy")}
        />
      </div>

      </main>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <DialogContent className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-6 rounded-3xl border border-white/30 bg-white/90 p-8 shadow-2xl shadow-purple-500/30 dark:border-white/20 dark:bg-gray-900/80 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <DialogClose
              className="absolute right-4 top-4 rounded-full p-1 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Close reminder"
            />
            <DialogHeader className="text-left">
              <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                {t("insights.suggestion.wednesday.title")}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                {reminderHint}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-gray-800">
                <CalendarDays className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("insights.suggestion.reminder.nextEvent")}
                </span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{reminderDateLabel}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{reminderTimeLabel}</p>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{reminderInsight}</p>
            </div>

            <DialogFooter className="flex flex-col items-center gap-3 pt-4 w-full">
              <Button
                asChild
                className="w-full rounded-lg bg-purple-600 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-purple-500"
              >
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsReminderDialogOpen(false)}
                >
                  {t("insights.suggestion.reminder.openCalendar")}
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-lg border-2 border-purple-600 py-3 text-base font-semibold text-purple-600 transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={handleDownloadIcs}
              >
                {t("insights.suggestion.reminder.downloadIcs")}
              </Button>
            </DialogFooter>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {reminderFootnote}
            </p>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <FooterSlim />
    </div>
  )
}














