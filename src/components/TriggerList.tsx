"use client"

import { useEffect, useId, useState } from "react"

import { cn } from "@/lib/utils"
import type { ProfessionalRiskFlag } from "@/src/lib/safetyEngine/professionalRiskDetector"
import type { Signal } from "@/src/lib/safetyEngine/signalDetector"

type RiskLevel = "low" | "medium" | "high"

type TriggerSignal = Signal & {
  matchedPhrase?: string
}

interface TriggerListProps {
  triggeredSignals: TriggerSignal[]
  professionalRiskFlags?: ProfessionalRiskFlag[]
  riskLevel: RiskLevel
}

interface DisplayRiskItem {
  id: string
  label: string
  technicalLabel: string
  matchedPhrase?: string
}

function getFriendlyLabel(signal: { id: string; category?: string; label: string }) {
  const normalizedLabel = signal.label.trim().toLowerCase()
  if (signal.id === "cold_no_collaboration") {
    return "Missing collaboration invitation"
  }
  if (signal.id === "cold_no_greeting") {
    return "Missing greeting"
  }
  if (signal.id === "esc_administrative_threat") {
    return "Administrative escalation language"
  }
  if (signal.id === "pro_medical_speculation") {
    return "Medical or diagnostic speculation"
  }
  if (signal.id === "pro_motive_attribution") {
    return "Motive attribution"
  }
  if (signal.id === "pro_psychological_interpretation") {
    return "Psychological interpretation"
  }
  if (normalizedLabel === "no collaboration invitation") {
    return "Missing collaboration invitation"
  }
  if (normalizedLabel === "no greeting") {
    return "Missing greeting"
  }
  if (signal.category === "accusation" || signal.category === "negative_generalisation") {
    return "Judgement wording"
  }
  return signal.label
}

function buildDisplayItems(
  triggeredSignals: TriggerSignal[],
  professionalRiskFlags: ProfessionalRiskFlag[],
) {
  const signalItems: DisplayRiskItem[] = triggeredSignals.map((signal) => ({
    id: signal.id,
    label: getFriendlyLabel(signal),
    technicalLabel: signal.label,
    matchedPhrase: signal.matchedPhrase,
  }))
  const professionalItems: DisplayRiskItem[] = professionalRiskFlags.map((flag) => ({
    id: flag.signalId,
    label: getFriendlyLabel({ id: flag.signalId, label: flag.label }),
    technicalLabel: flag.label,
    matchedPhrase: flag.matchedPhrase,
  }))
  return [...signalItems, ...professionalItems]
}

export function TriggerList({
  triggeredSignals,
  professionalRiskFlags = [],
  riskLevel,
}: TriggerListProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const displayItems = buildDisplayItems(triggeredSignals, professionalRiskFlags)
  const effectiveRiskLevel =
    riskLevel === "low" && displayItems.length > 0 ? "medium" : riskLevel
  const triggeredSignalsKey = triggeredSignals
    .map((signal) => `${signal.id}:${signal.matchedPhrase ?? ""}`)
    .join("|")
  const professionalRiskFlagsKey = professionalRiskFlags
    .map((flag) => `${flag.signalId}:${flag.matchedPhrase ?? ""}`)
    .join("|")

  useEffect(() => {
    setOpen(false)
  }, [riskLevel, triggeredSignalsKey, professionalRiskFlagsKey])

  if (displayItems.length === 0) {
    return null
  }

  const triggerCountLabel =
    displayItems.length === 1
      ? "1 language risk detected"
      : `${displayItems.length} language risks detected`
  const isHighRisk = effectiveRiskLevel === "high"

  return (
    <div
      className={cn(
        "rounded-xl p-4 shadow-sm",
        isHighRisk
          ? "border border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10"
          : "border border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10",
      )}
    >
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-900 transition hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200",
          open && "mb-3",
        )}
      >
        <span>{triggerCountLabel}</span>
        <span
          aria-hidden="true"
          className={cn(
            "shrink-0 text-slate-500 transition-transform dark:text-slate-300",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open ? (
        <ul id={contentId} className="space-y-2.5">
          {displayItems.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl bg-white/80 p-3 shadow-sm dark:bg-slate-950/30",
                isHighRisk
                  ? "border border-rose-100 dark:border-rose-400/10"
                  : "border border-amber-100 dark:border-amber-400/10",
              )}
            >
              <div className="flex flex-wrap items-start gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                    isHighRisk ? "bg-rose-400 dark:bg-rose-300" : "bg-amber-400 dark:bg-amber-300",
                  )}
                />
                <span className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                  {item.label}
                </span>
              </div>
              {(item.matchedPhrase || item.technicalLabel !== item.label) && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                  {item.matchedPhrase ? `Detected: "${item.matchedPhrase}"` : null}
                  {item.matchedPhrase && item.technicalLabel !== item.label ? " • " : null}
                  {item.technicalLabel !== item.label ? `Signal: ${item.technicalLabel}` : null}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div id={contentId} hidden />
      )}
    </div>
  )
}
