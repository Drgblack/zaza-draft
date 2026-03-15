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

function formatTriggerLabel(signal: TriggerSignal): string {
  if (!signal.matchedPhrase) {
    return signal.label
  }

  return `${signal.label} ("${signal.matchedPhrase}")`
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
        <ul className="mt-3 space-y-2">
          {triggeredSignals.map((signal) => (
            <li
              key={signal.id}
              className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
            >
              <span aria-hidden="true" className="mt-0.5 text-slate-500 dark:text-slate-400">
                •
              </span>
              <span>{formatTriggerLabel(signal)}</span>
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
        <ul className="space-y-2">
          {triggeredSignals.map((signal) => (
            <li
              key={signal.id}
              className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
            >
              <span aria-hidden="true" className="mt-0.5 text-slate-500 dark:text-slate-400">
                •
              </span>
              <span>{formatTriggerLabel(signal)}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
