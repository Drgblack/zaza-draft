"use client"

import { useEffect, useMemo, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { ReactionForecast as ReactionForecastData } from "@/src/lib/safetyEngine/reactionForecaster"

type RiskLevel = "low" | "medium" | "high"

interface ReactionForecastProps {
  forecast: ReactionForecastData
  riskLevel: RiskLevel
}

const REACTION_LABELS: Record<keyof ReactionForecastData, string> = {
  collaborative: "Collaborative",
  concerned: "Concerned",
  defensive: "Defensive",
  hostile: "Hostile",
  confused: "Confused",
}

function getTopForecastEntries(forecast: ReactionForecastData) {
  return Object.entries(forecast)
    .filter((entry): entry is [keyof ReactionForecastData, number] => entry[1] >= 8)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
}

function ForecastRows({ forecast }: { forecast: ReactionForecastData }) {
  const topEntries = getTopForecastEntries(forecast)

  if (topEntries.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3">
      {topEntries.map(([reaction, value]) => (
        <div key={reaction} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {REACTION_LABELS[reaction]}
            </span>
            <span className="text-slate-600 dark:text-slate-300">{value}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-slate-700 transition-[width] dark:bg-slate-200"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ReactionForecast({ forecast, riskLevel }: ReactionForecastProps) {
  const [open, setOpen] = useState(riskLevel === "high")
  const topEntries = useMemo(() => getTopForecastEntries(forecast), [forecast])

  useEffect(() => {
    setOpen(riskLevel === "high")
  }, [riskLevel, forecast])

  if (riskLevel === "low" || topEntries.length === 0) {
    return null
  }

  if (riskLevel === "high") {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-500/20 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Parent Reaction Forecast
        </p>
        <ForecastRows forecast={forecast} />
      </div>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-500/20 dark:bg-slate-900/60"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200",
          open && "mb-3",
        )}
      >
        <span>Parent Reaction Forecast</span>
        <span aria-hidden="true">▾</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ForecastRows forecast={forecast} />
      </CollapsibleContent>
    </Collapsible>
  )
}
