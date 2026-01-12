"use client"

import { useMemo, useState, useEffect } from "react"
import { ArrowLeft, CalendarDays, Download, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { StatCard } from "@/components/insights/stat-card"
import { TimeHeatmap } from "@/components/insights/time-heatmap"
import { ToneDistribution } from "@/components/insights/tone-distribution"
import { ConfidenceChart } from "@/components/insights/confidence-chart"
import { BadgesGrid } from "@/components/insights/badges-grid"
import DataControlsExplainer from "@/components/insights/data-controls-explainer"
import FooterSlim from "@/components/FooterSlim"
import Link from "next/link"
import { useLocale } from "@/hooks/use-locale"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
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

type InsightsSummary = {
  timeSaved?: {
    hours?: number
    trend?: number
    trendDirection?: "up" | "down"
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
}

const mockHeatmapData = Array.from({ length: 7 * 24 }, (_, i) => ({
  day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][Math.floor(i / 24)],
  hour: i % 24,
  intensity: Math.random() * (i % 24 >= 9 && i % 24 <= 17 ? 1 : 0.3),
}))

const mockToneData = [
  { tone: "Warm", percentage: 40, color: "#F59E0B" },
  { tone: "Professional", percentage: 30, color: "#8B5CF6" },
  { tone: "Empathetic", percentage: 20, color: "#EC4899" },
  { tone: "Direct", percentage: 10, color: "#3B82F6" },
]

const mockConfidenceData = [
  { week: "Week 1", editRate: 80 },
  { week: "Week 2", editRate: 65 },
  { week: "Week 3", editRate: 45 },
  { week: "Week 4", editRate: 30 },
]

const mockBadges = [
  {
    id: "1",
    name: "Time Reclaimed - Bronze",
    description: "Saved 2+ hours with AI assistance",
    icon: "??",
    status: "earned" as const,
  },
  {
    id: "2",
    name: "5-Week Streak",
    description: "Used Zaza Draft for 5 consecutive weeks",
    icon: "??",
    status: "earned" as const,
  },
  {
    id: "3",
    name: "Tone Master",
    description: "Used all 4 communication tones",
    icon: "??",
    status: "in-progress" as const,
    progress: 3,
    total: 4,
  },
  {
    id: "4",
    name: "Multilingual Champion",
    description: "Created drafts in 3+ languages",
    icon: "??",
    status: "locked" as const,
  },
  {
    id: "5",
    name: "One-Shot Wonder",
    description: "90% first-draft success rate",
    icon: "??",
    status: "in-progress" as const,
    progress: 72,
    total: 90,
  },
  {
    id: "6",
    name: "Weekend Warrior Retired",
    description: "Zero weekend drafts for 4 weeks",
    icon: "??",
    status: "locked" as const,
  },
]

const REMINDER_EVENT_TITLE = "Protected writing time - Zaza Draft"

export default function InsightsPage() {
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("7")
  const [showWellbeing, setShowWellbeing] = useState(false)
  const [shareData, setShareData] = useState(true)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [insightsSummary, setInsightsSummary] = useState<InsightsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const { locale, t } = useLocale()
  const { prefs } = useTeacherPrefs()
  const { user, status } = useAuth()
  const router = useRouter()
  const isAuthenticated = status === "authenticated" && Boolean(user?.uid)

  useEffect(() => {
    let active = true
    if (!isAuthenticated || !user) {
      setInsightsSummary(payload?.summary ?? null)
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
        const response = await fetch("/api/insights/summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json()
        if (!active) return
        if (response.ok && payload?.success) {
          setInsightsSummary(payload?.summary ?? null)
          setSummaryError(null)
        } else if (response.status === 404 || payload?.error?.code === "INSIGHTS_NOT_FOUND") {
          console.info("[insights] empty summary", response.status, payload?.error)
          setInsightsSummary(payload?.summary ?? null)
          setSummaryError(null)
        } else {
          console.warn("[insights] summary error", response.status, payload?.error)
          setInsightsSummary(payload?.summary ?? null)
          setSummaryError(payload?.error?.message || "Unable to load insights.")
        }
      } catch (error) {
        console.error("[insights] failed to load summary", error)
        if (!active) return
        setInsightsSummary(payload?.summary ?? null)
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
    }, [isAuthenticated, user])

  const teacherName = user?.displayName ?? prefs.firstName
  const hasTeacherName = Boolean(teacherName?.trim())
  const insightsHeading = hasTeacherName
    ? t("insights.title", { name: teacherName })
    : t("insights.titleNoName")
  const summaryTimeSaved = insightsSummary?.timeSaved
  const summaryDrafts = insightsSummary?.draftsCreated
  const summaryStreak = insightsSummary?.currentStreak
  const summaryQuality = insightsSummary?.qualityScore
  const hasMetrics =
    Boolean(insightsSummary) &&
    Boolean(
      summaryTimeSaved?.hours ||
        summaryDrafts?.total ||
        summaryStreak?.days ||
        summaryQuality?.score,
    )
  const downloadDisabled = !hasMetrics
  const timeSavedHours = summaryTimeSaved?.hours ?? 0
  const timeSavedTrend = summaryTimeSaved?.trend ?? 0
  const timeSavedContextCount = Math.round(summaryDrafts?.percentage ?? 0)
  const draftsTotal = summaryDrafts?.total ?? 0
  const draftsUsed = summaryDrafts?.usedWithoutEdits ?? 0
  const streakDays = summaryStreak?.days ?? 0
  const qualityScoreValue = summaryQuality?.score ?? 0
  const qualityTrendValue = summaryQuality?.trend ?? 0
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

  const getFireIntensity = (days: number) => {
    if (days >= 15) return "🔥🔥🔥"
    if (days >= 10) return "🔥🔥"
    return "🔥"
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
    const ownerLine = teacherName ? `Name: ${teacherName}` : "Name: N/A"

    const reportLines = [
      "Zaza Draft insights",
      ownerLine,
      "",
      timeSavedLine,
      draftsLine,
      streakLine,
      qualityLine,
      "",
      `Wellbeing insights sharing: ${shareData ? "On" : "Off"}`,
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
          {!summaryLoading && !hasMetrics && (
            <Card className="rounded-3xl border border-dashed border-gray-300 bg-white/80 dark:border-gray-700 dark:bg-white/5 p-8 text-center">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("insights.empty.title")}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {t("insights.empty.subtitle")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("insights.empty.cta")}
              </p>
            </Card>
          )}
          {hasMetrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <StatCard
            title={t("insights.timeSaved.title")}
            value={t("insights.timeSaved.hours", { hours: timeSavedHours.toFixed(1) })}
            numericValue={timeSavedHours}
            subtitle={t("insights.timeSaved.thisWeek")}
            trend={{
              value: t("insights.timeSaved.trend", { percent: `${timeSavedTrend}` }),
              direction: summaryTimeSaved?.trendDirection ?? "up",
              color: "text-green-600 dark:text-green-400",
            }}
            tooltip={t("insights.timeSaved.tooltip")}
            contextMessage={t("insights.timeSaved.context", { count: `${timeSavedContextCount}` })}
          />
          <StatCard
            title={t("insights.draftsCreated.title")}
            value={t("insights.draftsCreated.value", { count: draftsTotal })}
            numericValue={draftsTotal}
            subtitle={t("insights.draftsCreated.subtitle", { used: draftsUsed, total: draftsTotal })}
            icon={
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - 0.8)}`}
                    className="text-purple-600"
                  />
                </svg>
              </div>
            }
          celebration="🎯"
            tooltip={t("insights.draftsCreated.tooltip")}
          />
          <StatCard
            title={t("insights.currentStreak.title")}
            value={t("insights.currentStreak.days", { count: streakDays })}
            numericValue={streakDays}
            subtitle={t("insights.currentStreak.subtitle")}
            icon={<span className="text-3xl">{getFireIntensity(streakDays)}</span>}
            gradient="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20"
            tooltip={t("insights.currentStreak.tooltip")}
          />
          <StatCard
            title={t("insights.qualityScore.title")}
            value={t("insights.qualityScore.value", { score: qualityScoreValue })}
            numericValue={qualityScoreValue}
            subtitle={t("insights.qualityScore.subtitle")}
            trend={{
              value: t("insights.qualityScore.trend", { points: qualityTrendValue }),
              direction: "up",
              color: "text-green-600 dark:text-green-400",
            }}
            icon={<span className="text-2xl">âœ¨</span>}
            tooltip={t("insights.qualityScore.tooltip")}
            sparklineData={[85, 87, 89, 90, 91, 91, 92]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <TimeHeatmap
            data={mockHeatmapData}
            title={t("insights.heatmap.title")}
            insight={t("insights.heatmap.insight")}
            warning={t("insights.heatmap.warning", { count: "6" })}
          />
          <ToneDistribution
            data={mockToneData}
            title={t("insights.toneDistribution.title")}
            insight={t("insights.toneDistribution.insight", { percent: "40" })}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <ConfidenceChart
            data={mockConfidenceData}
            title={t("insights.confidence.title")}
            insight={t("insights.confidence.insight")}
          />
          <BadgesGrid badges={mockBadges} />
        </div>

        <Card className="p-6 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl shadow-purple-500/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("insights.wellbeing.title")}</h2>
              <span className="text-2xl">💚</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-white/80">{t("insights.wellbeing.toggle")}</span>
              <Switch checked={showWellbeing} onCheckedChange={setShowWellbeing} />
            </div>
          </div>

          {showWellbeing && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 border-2 border-purple-200 dark:border-purple-400/40 bg-white/90 dark:bg-white/15 backdrop-blur-xl shadow-lg shadow-purple-500/10">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🌙</span>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
                        {t("insights.wellbeing.afterHours", { percent: "18" })}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                        <span className="text-sm text-gray-600 dark:text-white/80">
                          {t("insights.wellbeing.healthyBoundary")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-white/70 mb-3">
                        {t("insights.wellbeing.afterHours.desc", { count: "3" })}
                      </p>
                      <a
                        href="https://www.zazadraft.com/products/shield"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline decoration-2 underline-offset-2 transition-colors"
                      >
                        {t("insights.wellbeing.learnBoundaries")}
                      </a>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 bg-white/90 dark:bg-white/15 backdrop-blur-xl border-white/30 shadow-lg shadow-purple-500/10">
                  <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
                    {t("insights.wellbeing.workLife")}
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.85)}`}
                          className="text-green-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">85</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white/70">
                        {t("insights.wellbeing.weekendProtection")}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">90%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white/70">
                        {t("insights.wellbeing.eveningBoundaries")}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-white/70">
                        {t("insights.wellbeing.consecutiveDays")}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">80%</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>

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
                <span className="text-3xl filter drop-shadow-lg">â­</span>
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
          shareData={shareData}
          onShareDataChange={setShareData}
          onPrivacySettingsClick={() => {
            // TODO: wire to real settings modal later
            window.location.href = "/privacy"
          }}
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












