"use client"

import { useEffect, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { Signal } from "@/src/lib/safetyEngine/signalDetector"

type RiskLevel = "low" | "medium" | "high"

type TriggerSignal = Signal & {
  matchedPhrase?: string
}

interface TriggerListProps {
  triggeredSignals: TriggerSignal[]
  riskLevel: RiskLevel
}

function getMatchedPhrase(signal: TriggerSignal): string | null {
  return signal.matchedPhrase ? `"${signal.matchedPhrase}"` : null
}

export function TriggerList({ triggeredSignals, riskLevel }: TriggerListProps) {
  const [open, setOpen] = useState(riskLevel === "high")

  useEffect(() => {
    setOpen(riskLevel === "high")
  }, [riskLevel, triggeredSignals])

  if (riskLevel === "low" || triggeredSignals.length === 0) {
    return null
  }

  if (riskLevel === "high") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Triggers detected:</p>
        <ul className="mt-3 space-y-2.5">
          {triggeredSignals.map((signal) => (
            <li
              key={signal.id}
              className="rounded-xl border border-rose-100 bg-white/80 p-3 shadow-sm dark:border-rose-400/10 dark:bg-slate-950/30"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 dark:bg-rose-300"
                />
                <span className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                  {signal.label}
                </span>
                {getMatchedPhrase(signal) ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800 dark:bg-rose-500/20 dark:text-rose-100">
                    {getMatchedPhrase(signal)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const triggerCountLabel = `${triggeredSignals.length} potential triggers detected ▾`

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200",
          open && "mb-3",
        )}
      >
        <span>{triggerCountLabel}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2.5">
          {triggeredSignals.map((signal) => (
            <li
              key={signal.id}
              className="rounded-xl border border-amber-100 bg-white/80 p-3 shadow-sm dark:border-amber-400/10 dark:bg-slate-950/30"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 dark:bg-amber-300"
                />
                <span className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                  {signal.label}
                </span>
                {getMatchedPhrase(signal) ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-100">
                    {getMatchedPhrase(signal)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
