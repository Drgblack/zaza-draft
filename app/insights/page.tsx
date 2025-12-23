"use client"

import { useState } from "react"
import { Download, Shield } from "lucide-react"
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
import { ArrowLeft } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"

// Mock data
const mockMetrics = {
  timeSaved: { hours: 4.2, trend: 15, trendDirection: "up" as const },
  draftsCreated: { total: 18, usedWithoutEdits: 8, percentage: 80 },
  currentStreak: { days: 5 },
  qualityScore: { score: 92, trend: 5 },
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
    icon: "🏆",
    status: "earned" as const,
  },
  {
    id: "2",
    name: "5-Week Streak",
    description: "Used Zaza Draft for 5 consecutive weeks",
    icon: "🔥",
    status: "earned" as const,
  },
  {
    id: "3",
    name: "Tone Master",
    description: "Used all 4 communication tones",
    icon: "🎭",
    status: "in-progress" as const,
    progress: 3,
    total: 4,
  },
  {
    id: "4",
    name: "Multilingual Champion",
    description: "Created drafts in 3+ languages",
    icon: "🌍",
    status: "locked" as const,
  },
  {
    id: "5",
    name: "One-Shot Wonder",
    description: "90% first-draft success rate",
    icon: "🎯",
    status: "in-progress" as const,
    progress: 72,
    total: 90,
  },
  {
    id: "6",
    name: "Weekend Warrior Retired",
    description: "Zero weekend drafts for 4 weeks",
    icon: "🌴",
    status: "locked" as const,
  },
]

export default function InsightsPage() {
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("7")
  const [showWellbeing, setShowWellbeing] = useState(false)
  const [shareData, setShareData] = useState(true)
  const { locale, t } = useLocale()
  const { prefs } = useTeacherPrefs()

  const getFireIntensity = (days: number) => {
    if (days >= 15) return "🔥🔥🔥"
    if (days >= 10) return "🔥🔥"
    return "🔥"
  }

  const handleDownloadReport = () => {
    const reportLines = [
      `Zaza Draft insights (${new Date().toLocaleDateString(locale)})`,
      "",
      `Time saved: ${mockMetrics.timeSaved.hours}h (${mockMetrics.timeSaved.trend}% ↑)`,
      `Drafts created: ${mockMetrics.draftsCreated.total} (${mockMetrics.draftsCreated.usedWithoutEdits} used without edits)`,
      `Current streak: ${mockMetrics.currentStreak.days} days`,
      `Quality score: ${mockMetrics.qualityScore.score} (${mockMetrics.qualityScore.trend}% ↑)`,
      "",
      "Tone distribution:",
      ...mockToneData.map((item) => `${item.tone}: ${item.percentage}%`),
      "",
      `Confidence trend: ${mockConfidenceData.map((row) => `${row.week} ${row.editRate}%`).join(" | ")}`,
      "",
      `Wellbeing insights sharing: ${shareData ? "enabled" : "disabled"}`,
      `Date range: Last ${dateRange} days`,
    ]

    const blob = new Blob([reportLines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `zaza-insights-${new Date().toISOString().slice(0, 10)}.txt`
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
                {t("insights.title", { name: prefs.firstName })}
              </h1>
              <p className="text-white/90 mt-1">{t("insights.subtitle")}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-white/80">
                <Shield className="h-3 w-3" />
                <span>{t("insights.dataControl")}</span>
              </div>
               <Button
                 variant="outline"
                 size="sm"
                 className="gap-2 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
                 onClick={handleDownloadReport}
               >
                 <Download className="h-4 w-4" />
                 {t("insights.downloadReport")}
               </Button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {(["7", "30", "90"] as const).map((days) => (
              <Button
                key={days}
                variant={dateRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(days)}
                className={`rounded-full ${
                  dateRange === days
                    ? "bg-white text-purple-600 hover:bg-white/90 shadow-lg"
                    : "bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
                }`}
              >
                {t(`insights.filter.last${days}` as any)}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <StatCard
            title={t("insights.timeSaved.title")}
            value={t("insights.timeSaved.hours", { hours: "4.2" })}
            numericValue={4.2}
            subtitle={t("insights.timeSaved.thisWeek")}
            trend={{
              value: t("insights.timeSaved.trend", { percent: "15" }),
              direction: "up",
              color: "text-green-600 dark:text-green-400",
            }}
            tooltip={t("insights.timeSaved.tooltip")}
            contextMessage={t("insights.timeSaved.context", { count: "3" })}
          />
          <StatCard
            title={t("insights.draftsCreated.title")}
            value={t("insights.draftsCreated.value", { count: "18" })}
            numericValue={18}
            subtitle={t("insights.draftsCreated.subtitle", { used: "8", total: "10" })}
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
            value={t("insights.currentStreak.days", { count: "5" })}
            numericValue={5}
            subtitle={t("insights.currentStreak.subtitle")}
            icon={<span className="text-3xl">{getFireIntensity(5)}</span>}
            gradient="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20"
            tooltip={t("insights.currentStreak.tooltip")}
          />
          <StatCard
            title={t("insights.qualityScore.title")}
            value={t("insights.qualityScore.value", { score: "92" })}
            numericValue={92}
            subtitle={t("insights.qualityScore.subtitle")}
            trend={{
              value: t("insights.qualityScore.trend", { points: "5" }),
              direction: "up",
              color: "text-green-600 dark:text-green-400",
            }}
            icon={<span className="text-2xl">✨</span>}
            tooltip={t("insights.qualityScore.tooltip")}
            sparklineData={[85, 87, 89, 90, 91, 91, 92]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <ConfidenceChart
            data={mockConfidenceData}
            title={t("insights.confidence.title")}
            insight={t("insights.confidence.insight")}
          />
          <BadgesGrid badges={mockBadges} />
        </div>

        <Card className="p-6 mb-10 bg-white/85 dark:bg-white/10 backdrop-blur-2xl border-white/30 shadow-2xl shadow-purple-500/10">
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

        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t("insights.suggestions.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1 bg-white/85 dark:bg-white/15 backdrop-blur-xl border-white/30 shadow-lg">
              <span className="text-3xl mb-3 block filter drop-shadow-lg">💡</span>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                {t("insights.suggestion.empathetic.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/80 mb-4">
                {t("insights.suggestion.empathetic.desc")}
              </p>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30"
              >
                {t("insights.suggestion.empathetic.cta")}
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1 bg-white/85 dark:bg-white/15 backdrop-blur-xl border-white/30 shadow-lg">
              <span className="text-3xl mb-3 block filter drop-shadow-lg">📅</span>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                {t("insights.suggestion.wednesday.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-white/80 mb-4">{t("insights.suggestion.wednesday.desc")}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/20 backdrop-blur-md border-purple-200 dark:border-purple-400/30 text-gray-900 dark:text-white hover:bg-white/30"
              >
                {t("insights.suggestion.wednesday.cta")}
              </Button>
            </Card>

            <Card className="p-6 hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300 dark:border-purple-400/40 bg-white/85 dark:bg-white/15 backdrop-blur-xl shadow-xl shadow-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl filter drop-shadow-lg">⭐</span>
                <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-500/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full shadow-sm">
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
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30"
              >
                {t("insights.suggestion.classBrain.cta")}
              </Button>
            </Card>
          </div>
        </div>

        <DataControlsExplainer
  shareData={shareData}
  onShareDataChange={setShareData}
  onPrivacySettingsClick={() => {
    // TODO: wire to real settings modal later
    window.location.href = "/privacy"
  }}
/>

      </main>

      <FooterSlim />
    </div>
  )
}
