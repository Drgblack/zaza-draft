"use client"

import { CalendarDays, ChevronRight, FileText, History, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/use-locale"

interface MiniInsightsBarProps {
  draftsCreatedThisWeek: number
  recentDraftsAvailable: number
  usedDraftThisTerm: boolean
  selectedModeLabel: string
}

export function MiniInsightsBar({
  draftsCreatedThisWeek,
  recentDraftsAvailable,
  usedDraftThisTerm,
  selectedModeLabel,
}: MiniInsightsBarProps) {
  const router = useRouter()
  const { t } = useLocale()
  const [showUsageSignals, setShowUsageSignals] = useState(true)

  useEffect(() => {
    const showInsights = localStorage.getItem("show_wellbeing_insights")
    if (showInsights === "false") {
      setShowUsageSignals(false)
    }
  }, [])

  if (!showUsageSignals) {
    return null
  }

  const badgeBase =
    "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-[inset_0_1px_4px_rgba(255,255,255,0.7),0_6px_16px_rgba(0,0,0,0.08)]"
  const badgeStyles = {
    weekly: "border-sky-200 bg-white/90 text-sky-900 dark:border-sky-500 dark:bg-white/10 dark:text-sky-100",
    history:
      "border-slate-200 bg-white/90 text-slate-900 dark:border-slate-500 dark:bg-white/10 dark:text-slate-100",
    term: "border-emerald-200 bg-white/90 text-emerald-900 dark:border-emerald-500 dark:bg-white/10 dark:text-emerald-100",
    mode: "border-indigo-200 bg-white/90 text-indigo-900 dark:border-indigo-500 dark:bg-white/10 dark:text-indigo-100",
  }

  return (
    <div
      className="glass mt-4 mb-6 rounded-xl border border-white/50 bg-white/90 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.12)] backdrop-blur-[32px] dark:border-white/40 dark:bg-white/15"
      role="region"
      aria-label={t("insights.mini.regionLabel")}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`${badgeBase} ${badgeStyles.weekly}`}>
            <FileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{t("insights.mini.metric.draftsThisWeek", { count: draftsCreatedThisWeek })}</span>
          </div>

          <div className={`${badgeBase} ${badgeStyles.history}`}>
            <History className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              {t("insights.mini.metric.recentDraftsAvailable", {
                count: recentDraftsAvailable,
              })}
            </span>
          </div>

          <div className={`${badgeBase} ${badgeStyles.term}`}>
            <CalendarDays className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              {usedDraftThisTerm
                ? t("insights.mini.metric.usedThisTerm")
                : t("insights.mini.metric.firstUseThisTerm")}
            </span>
          </div>

          <div className={`${badgeBase} ${badgeStyles.mode}`}>
            <MessageSquare className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{t("insights.mini.metric.modeSelected", { mode: selectedModeLabel })}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="flex-shrink-0 gap-2 rounded-full px-3 py-2 text-xs font-semibold"
          onClick={() => router.push("/insights")}
          aria-label={t("insights.mini.viewInsights")}
        >
          <span>{t("insights.mini.viewInsights")}</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" strokeWidth={2.5} />
        </Button>
      </div>

      <div className="sr-only">
        {t("insights.mini.metric.draftsThisWeek", { count: draftsCreatedThisWeek })}.{" "}
        {t("insights.mini.metric.recentDraftsAvailable", {
          count: recentDraftsAvailable,
        })}
        .{" "}
        {usedDraftThisTerm
          ? t("insights.mini.metric.usedThisTerm")
          : t("insights.mini.metric.firstUseThisTerm")}
        . {t("insights.mini.metric.modeSelected", { mode: selectedModeLabel })}.
      </div>
    </div>
  )
}
