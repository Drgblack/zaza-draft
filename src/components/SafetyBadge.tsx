"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RiskLevel = "low" | "medium" | "high"

interface SafetyBadgeProps {
  riskLevel?: RiskLevel
}

const BADGE_COPY: Record<RiskLevel, string> = {
  low: "Communication risk: Low",
  medium: "Communication risk: Medium",
  high: "Communication risk: High",
}

const BADGE_STYLES: Record<RiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  high: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
}

export function SafetyBadge({ riskLevel }: SafetyBadgeProps) {
  if (!riskLevel) {
    return null
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide shadow-sm",
        BADGE_STYLES[riskLevel],
      )}
    >
      {BADGE_COPY[riskLevel]}
    </Badge>
  )
}
