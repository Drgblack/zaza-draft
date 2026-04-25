"use client"

import { useEffect, useMemo, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  interpretReactionForecast,
  normalizeReactionForecast,
  REACTION_LADDER,
  type ReactionForecast as ReactionForecastData,
} from "@/src/lib/safetyEngine/reactionForecaster"

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

function getForecastEntries(forecast: ReactionForecastData) {
  return REACTION_LADDER
    .map((reaction) => [reaction, forecast[reaction]] as [keyof ReactionForecastData, number])
    .sort((left, right) => right[1] - left[1])
}

function ForecastRows({ forecast }: { forecast: ReactionForecastData }) {
  const entries = getForecastEntries(forecast)

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3">
      {entries.map(([reaction, value]) => (
        <div
          key={reaction}
          className="rounded-xl border border-slate-200 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-950/25"
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {REACTION_LABELS[reaction]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {value}%
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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

function ForecastSummary({
  forecast,
  showTitle = true,
}: {
  forecast: ReactionForecastData
  showTitle?: boolean
}) {
  const interpretation = useMemo(
    () => interpretReactionForecast(forecast),
    [forecast],
  )

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/25">
      {showTitle ? (
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Parent Reaction Predictor
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Escalation Risk
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {interpretation.escalationRisk}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Most Likely Reaction
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {interpretation.mostLikelyReaction}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Tone Recommendation
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {interpretation.toneRecommendation}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ReactionForecast({ forecast, riskLevel }: ReactionForecastProps) {
  const [open, setOpen] = useState(riskLevel === "high")
  const normalizedForecast = useMemo(() => normalizeReactionForecast(forecast), [forecast])
  const entries = useMemo(() => getForecastEntries(normalizedForecast), [normalizedForecast])

  useEffect(() => {
    setOpen(riskLevel === "high")
  }, [riskLevel, normalizedForecast])

  if (entries.length === 0) {
    return null
  }

  if (riskLevel === "high") {
    return (
      <div className="rounded-xl border border-rose-200 bg-white/90 p-4 dark:border-rose-500/20 dark:bg-slate-900/50">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Parent Reaction Predictor
          </p>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Based on tone and wording, here's how this message is likely to be received.
          </p>
        </div>
        <ForecastSummary forecast={normalizedForecast} showTitle={false} />
        <ForecastRows forecast={normalizedForecast} />
      </div>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "rounded-xl border bg-white/90 p-4 dark:bg-slate-900/50",
        riskLevel === "medium"
          ? "border-amber-200 dark:border-amber-500/20"
          : "border-emerald-200 dark:border-emerald-500/20",
      )}
    >
      <div className={cn(open && "mb-3")}>
        <ForecastSummary forecast={normalizedForecast} />
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Based on tone and wording, here's how this message is likely to be received.
        </p>
      </div>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200"
      >
        <span>{open ? "Hide probability bars" : "Show probability bars"}</span>
        <span aria-hidden="true" className="shrink-0 text-slate-500 dark:text-slate-300">▾</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ForecastRows forecast={normalizedForecast} />
      </CollapsibleContent>
    </Collapsible>
  )
}
