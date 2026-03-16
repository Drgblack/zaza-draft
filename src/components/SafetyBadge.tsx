"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SafeToSendStatus } from "@/lib/safe-to-send"

interface SafetyBadgeProps {
  status?: SafeToSendStatus | "BLOCKED_FOR_SAFETY"
}

const BADGE_COPY: Record<NonNullable<SafetyBadgeProps["status"]>, string> = {
  READY_TO_SEND: "Ready to send",
  SENSITIVE_TOPIC: "Sensitive topic",
  REVIEW_ONCE_MORE: "Revise once more",
  BLOCKED_FOR_SAFETY: "Blocked for safety",
}

const BADGE_STYLES: Record<NonNullable<SafetyBadgeProps["status"]>, string> = {
  READY_TO_SEND:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  SENSITIVE_TOPIC:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  REVIEW_ONCE_MORE:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200",
  BLOCKED_FOR_SAFETY:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
}

export function SafetyBadge({ status }: SafetyBadgeProps) {
  if (!status) {
    return null
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide shadow-sm",
        BADGE_STYLES[status],
      )}
    >
      {BADGE_COPY[status]}
    </Badge>
  )
}
