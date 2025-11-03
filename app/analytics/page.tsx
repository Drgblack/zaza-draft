"use client"

import { useState, useEffect } from "react"
import {
  Clock,
  Target,
  Flame,
  Star,
  Info,
  X,
  TrendingUp,
  Lock,
  AlertTriangle,
  CheckCircle2,
  LockIcon,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { MetricCardSkeleton } from "@/components/skeletons"
import { MobileNav } from "@/components/mobile-nav"
import { ExportAnalyticsMenu } from "@/components/export-analytics-menu"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const DEMO_GROWTH_DATA = [
  { week: "Week 1", editRate: 80 },
  { week: "Week 2", editRate: 65 },
  { week: "Week 3", editRate: 45 },
  { week: "Week 4", editRate: 30 },
]

const DEMO_TONE_DATA = [
  { name: "Professional", value: 40, color: "#9333ea" },
  { name: "Empathetic", value: 30, color: "#3b82f6" },
  { name: "Warm", value: 20, color: "#10b981" },
  { name: "Firm", value: 10, color: "#f59e0b" },
]

const DEMO_HEATMAP_DATA = [
  { day: "Mon", hours: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Tue", hours: [0, 0, 0, 0, 0, 0, 0, 2, 3, 2, 2, 1, 2, 8, 6, 2, 1, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Wed", hours: [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 1, 1, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Thu", hours: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Fri", hours: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Sat", hours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Sun", hours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
]

export default function AnalyticsPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<"7" | "30" | "90">("7")
  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)
  const [shareData, setShareData] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const getHeatmapColor = (value: number) => {
    if (value === 0) return "bg-gray-100 dark:bg-gray-800"
    if (value <= 2) return "bg-purple-200 dark:bg-purple-900/40"
    if (value <= 4) return "bg-purple-400 dark:bg-purple-700/60"
    if (value <= 6) return "bg-purple-600 dark:bg-purple-600/80"
    return "bg-purple-800 dark:bg-purple-500"
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row pb-16 lg:pb-0">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title={t.dashboard} subtitle={t.analytics} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mb-6 sm:mb-8 flex items-center justify-end">
            <ExportAnalyticsMenu
              onExport={(format) => {
                console.log("Exported analytics as:", format)
              }}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : (
            <div className="space-y-6">
              {showDemoBanner && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg px-4 py-3 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      This is a preview with example data. Your real analytics will appear here after you create your
                      first draft.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = "/")}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
                  >
                    Create Your First Draft
                  </Button>
                  <button
                    onClick={() => setShowDemoBanner(false)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex-shrink-0"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
                {(["7", "30", "90"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      selectedPeriod === period
                        ? "border-purple-600 text-purple-600 dark:text-purple-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    Last {period} days
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Time Saved Card */}
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">4.2 hours</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">This week</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    That's 3 fewer emails on Sunday evening!
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+15% from last week</span>
                  </div>
                </Card>

                {/* Drafts Created Card */}
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xl">🎯</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">18</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Drafts created</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">8 of 10 used without edits</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "80%" }} />
                  </div>
                </Card>

                {/* Current Streak Card */}
                <Card className="p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    5 weeks <span className="text-2xl">🔥</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current streak</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">Keep it going!</div>
                </Card>

                {/* Quality Score Card */}
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xl">✨</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">92</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Edit depth score</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">Last 7 days trend</div>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+5 points this month</span>
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">When You Draft Best</h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="flex gap-1 mb-2">
                      <div className="w-12" />
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 text-xs text-center text-gray-500 dark:text-gray-400">
                          {i % 3 === 0 ? `${i}` : ""}
                        </div>
                      ))}
                    </div>
                    {DEMO_HEATMAP_DATA.map((row) => (
                      <div key={row.day} className="flex gap-1 mb-1">
                        <div className="w-12 text-xs text-gray-600 dark:text-gray-400 flex items-center">{row.day}</div>
                        {row.hours.map((value, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-6 rounded ${getHeatmapColor(value)} transition-all hover:ring-2 hover:ring-purple-400 cursor-pointer`}
                            title={`${row.day} ${i}:00 - ${value} drafts`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg p-3">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    Tuesday afternoons are your peak productivity time—consider blocking that time!
                  </p>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Communication Style - Donut Chart */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Communication Style</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={DEMO_TONE_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {DEMO_TONE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {DEMO_TONE_DATA.map((tone) => (
                      <div key={tone.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tone.color }} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {tone.name} ({tone.value}%)
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                    You used 'Empathetic' 40% more in difficult conversations this month
                  </div>
                </Card>

                {/* Growth Journey - Line Chart */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Growth Journey</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={DEMO_GROWTH_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: "12px" }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="editRate"
                          stroke="#9333ea"
                          strokeWidth={3}
                          dot={{ fill: "#9333ea", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg p-3">
                    <p className="text-sm text-green-900 dark:text-green-100">
                      Growing confidence! Your drafts need less editing over time.
                    </p>
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Achievements Unlocked</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Unlocked Achievement 1 */}
                  <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">⏰</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Time Reclaimed - Bronze</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Save 5 hours total</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: "75%" }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">3/4 progress</p>
                  </div>

                  {/* Unlocked Achievement 2 */}
                  <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">🔥</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">5-Week Streak</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Draft for 5 weeks straight</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: "100%" }} />
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Complete!</p>
                  </div>

                  {/* Unlocked Achievement 3 */}
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">✨</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Tone Master</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Use all 4 tones</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">3/4 tones used</p>
                  </div>

                  {/* Unlocked Achievement 4 */}
                  <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">🎯</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">One-Shot Wonder</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">90 drafts without edits</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "80%" }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">72/90 drafts</p>
                  </div>

                  {/* Locked Achievement 5 */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/20 opacity-60">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl grayscale">🌍</span>
                      <LockIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-1">Multilingual Champion</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Use German language</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Locked</p>
                  </div>

                  {/* Locked Achievement 6 */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/20 opacity-60">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl grayscale">💚</span>
                      <LockIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-1">Weekend Warrior Retired</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">No weekend drafts for 4 weeks</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Locked</p>
                  </div>
                </div>
              </Card>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Weekend work: 6 drafts</h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                      You drafted 3 times after 10pm this week. Consider these time-saving strategies:
                    </p>
                    <a href="#" className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline font-medium">
                      Learn about boundaries →
                    </a>
                  </div>
                </div>
              </div>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Your Wellbeing Matters <span className="text-xl">💚</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Show wellbeing insights</span>
                    <Switch checked={showWellbeingInsights} onCheckedChange={setShowWellbeingInsights} />
                  </div>
                </div>

                {showWellbeingInsights && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* After-hours Drafting */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">After-hours Drafting</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">18%</span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                          🌙 Healthy boundary
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        You drafted 3 times after 10pm this week. Consider these time-saving strategies:
                      </p>
                      <a href="#" className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">
                        Learn about boundaries →
                      </a>
                    </div>

                    {/* Work-Life Balance Score */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Work-Life Balance Score</h4>
                      <div className="flex items-center justify-center mb-4">
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full transform -rotate-90">
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
                              className="text-green-600 dark:text-green-400"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">85</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Weekend protection:</span>
                          <span className="font-medium text-gray-900 dark:text-white">90%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Evening boundaries:</span>
                          <span className="font-medium text-gray-900 dark:text-white">75%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Consecutive days:</span>
                          <span className="font-medium text-gray-900 dark:text-white">80%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personalized Suggestions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Suggestion 1 */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-3">💡</div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Try 'Empathetic' tone first</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      You regenerate often on parent emails. Using the 'Empathetic' tone first could save you time.
                    </p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Update preferences
                    </Button>
                  </div>

                  {/* Suggestion 2 */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-3">📅</div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Protect your Wednesday flow</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Your Wednesday drafts have 50% fewer edits. Consider scheduling heavy writing then.
                    </p>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Set reminder
                    </Button>
                  </div>

                  {/* Suggestion 3 */}
                  <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-3xl">⭐</span>
                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-medium">NEW</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Unlock Class Brain</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Add student context to increase your one-shot rate by 35%
                    </p>
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                      Learn more
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Controls</h3>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Share anonymized data to improve Zaza
                      </span>
                      <Switch checked={shareData} onCheckedChange={setShareData} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Help improve Zaza for 1,000+ teachers worldwide
                    </p>
                  </div>
                </div>
                <a
                  href="/privacy"
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium mt-3 inline-block"
                >
                  Learn about data privacy →
                </a>
              </Card>

              <div className="text-center text-sm text-gray-500 dark:text-gray-500 py-4">
                All data shown is example data. Your analytics will replace this after your first draft.
              </div>
            </div>
          )}
        </main>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
