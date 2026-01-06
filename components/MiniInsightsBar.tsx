"use client"

import { Clock, Flame, Heart, ChevronRight, TrendingUp, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/use-locale"

interface InsightsData {
  timeSaved: { current: number; previous: number } | null
  streak: { current: number; previous: number } | null
  balance: { score: number; previous: number } | null
  hasEnoughData: boolean
}

function formatTimeSavedText(current: number, previous: number): { text: string; showTrend: boolean } {
  const delta = ((current - previous) / previous) * 100

  if (delta >= 10) {
    return {
      text: `+${Math.round(delta)}% time saved`,
      showTrend: true,
    }
  } else if (delta >= -5 && delta < 10) {
    return {
      text: `${current.toFixed(1)}h saved this week`,
      showTrend: false,
    }
  } else {
    return {
      text: `${current.toFixed(1)}h saved`,
      showTrend: false,
    }
  }
}

function formatStreakText(streak: number): string {
  if (streak >= 8) {
    return `${streak} weeks strong!`
  } else if (streak >= 4) {
    return `${streak}-week streak 🔥`
  } else if (streak >= 1) {
    return `${streak}-week streak`
  } else {
    return "Start your streak!"
  }
}

function formatBalanceText(balance: number): string {
  if (balance >= 85) {
    return `${balance}% boundaries kept`
  } else if (balance >= 70) {
    return `${balance}% balance`
  } else if (balance >= 50) {
    return `${balance}% boundaries`
  } else {
    return `${balance}% building habits`
  }
}

export function MiniInsightsBar() {
  const router = useRouter()
  const { t } = useLocale()
  const [data, setData] = useState<InsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const showInsights = localStorage.getItem("show_wellbeing_insights")
    if (showInsights === "false") {
      setShowWellbeingInsights(false)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300))

        // Mock data - in production, this would come from API
        const mockData = {
          timeSaved: { current: 4.2, previous: 3.6 },
          streak: { current: 5, previous: 4 },
          balance: { score: 85, previous: 82 },
          hasEnoughData: true, // Set to false for new users with <3 drafts
        }

        setData(mockData)
      } catch (error) {
        console.error("[v0] Failed to load insights:", error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (hasError || !showWellbeingInsights) {
    return null
  }

  if (isLoading) {
    return (
      <div className="glass shadow-soft rounded-xl py-3 px-4 mt-4 mb-6 border border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary">{t("insights.mini.loading")}</span>
        </div>
      </div>
    )
  }

  if (!data?.hasEnoughData) {
    return (
      <div className="glass shadow-[0_8px_28px_rgba(0,0,0,0.12)] rounded-xl py-3 px-4 mt-4 mb-6 border border-white/50 dark:border-white/40 transition-all duration-200 hover:shadow-[0_12px_36px_rgba(147,51,234,0.25)] hover:-translate-y-0.5 bg-white/90 dark:bg-white/15 backdrop-blur-[32px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-primary dark:text-purple-200">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{t("insights.mini.createFirstDraft")}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/insights")}
            className="gap-2 px-3 py-1.5 rounded-full shadow-none text-xs"
            aria-label={t("insights.mini.learnMore")}
          >
            <span>{t("insights.mini.learnMore")}</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    )
  }

  const timeText = formatTimeSavedText(data.timeSaved!.current, data.timeSaved!.previous)
  const streakText = formatStreakText(data.streak!.current)
  const balanceText = formatBalanceText(data.balance!.score)

  const animationClass = prefersReducedMotion ? "" : "animate-fade-in"
  const badgeBase =
<<<<fix/i18n-de-zara-textarea
    "flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-[inset_0_1px_4px_rgba(255,255,255,0.7),0_6px_16px_rgba(0,0,0,0.08)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-white/70 text-sm font-semibold whitespace-nowrap cursor-pointer motion-safe:transition-shadow motion-safe:transform hover:-translate-y-[1px] hover:shadow-[0_12px_35px_rgba(0,0,0,0.12)] active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none"
====
    "flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-[inset_0_1px_4px_rgba(255,255,255,0.7),0_6px_16px_rgba(0,0,0,0.08)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-white/70 text-sm font-semibold whitespace-nowrap"
>>>> main
  const badgeStyles = {
    time: "border-purple-200 bg-white/90 text-purple-900 dark:border-purple-600 dark:bg-white/10 dark:text-purple-100",
    streak: "border-orange-200 bg-white/90 text-orange-900 dark:border-orange-500 dark:bg-white/10 dark:text-orange-100",
    balance: "border-emerald-200 bg-white/90 text-emerald-900 dark:border-emerald-500 dark:bg-white/10 dark:text-emerald-100",
  }

  return (
    <div
      className={`glass shadow-[0_8px_28px_rgba(0,0,0,0.12)] rounded-xl py-3 px-4 mt-4 mb-6 border border-white/50 dark:border-white/40 transition-all duration-200 hover:shadow-[0_12px_36px_rgba(147,51,234,0.25)] hover:-translate-y-0.5 bg-white/90 dark:bg-white/15 backdrop-blur-[32px] ${animationClass}`}
      role="region"
      aria-label={t("insights.mini.regionLabel")}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-row flex-wrap items-center gap-3 flex-1 min-w-0 w-full lg:flex-nowrap">
          <button
            onClick={() => router.push("/insights#time-saved")}
            className={`${badgeBase} ${badgeStyles.time}`}
            aria-label={t("insights.mini.viewTime")}
            title={t("insights.mini.viewTime")}
          >
            <Clock
              className="w-5 h-5 flex-shrink-0 text-purple-700 dark:text-purple-200"
              aria-hidden="true"
              strokeWidth={2}
            />
            <span className="font-semibold text-purple-900 dark:text-purple-100">
              {timeText.showTrend && (
                <TrendingUp
                  className="inline w-3 h-3 mr-1 text-emerald-700 dark:text-emerald-300"
                  aria-hidden="true"
                  strokeWidth={2}
                />
              )}
              {timeText.text}
            </span>
          </button>

          <button
            onClick={() => router.push("/insights#streak")}
            className={`${badgeBase} ${badgeStyles.streak}`}
            aria-label={t("insights.mini.viewStreak")}
            title={t("insights.mini.viewStreak")}
          >
            <Flame
              className="w-5 h-5 flex-shrink-0 text-orange-700 dark:text-orange-200"
              aria-hidden="true"
              strokeWidth={2}
            />
            <span className="font-semibold text-orange-900 dark:text-orange-100">{streakText}</span>
          </button>

          <button
            onClick={() => router.push("/insights#wellbeing")}
            className={`${badgeBase} ${badgeStyles.balance}`}
            aria-label={t("insights.mini.viewBalance")}
            title={t("insights.mini.viewBalance")}
          >
            <Heart
              className="w-5 h-5 flex-shrink-0 text-emerald-700 dark:text-emerald-200"
              aria-hidden="true"
              strokeWidth={2}
            />
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">{balanceText}</span>
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="flex-shrink-0 gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          onClick={() => router.push("/insights")}
          aria-label={t("insights.mini.viewInsights")}
        >
          <span>{t("insights.mini.viewInsights")}</span>
          <ChevronRight className="w-3 h-3" aria-hidden="true" strokeWidth={2.5} />
        </Button>
      </div>

      <div className="sr-only">
        You saved {data.timeSaved!.current.toFixed(1)} hours this week. You're on a {data.streak!.current}-week streak.
        Your healthy boundaries score is {data.balance!.score} percent.
      </div>
    </div>
  )
}
