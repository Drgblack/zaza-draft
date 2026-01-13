"use client"

import { useLocale } from "@/hooks/use-locale"

type ReframeTier = "tier1" | "tier2" | "tier3"

interface ReframeExplanationProps {
  tier?: ReframeTier | null
}

export function ReframeExplanation({ tier }: ReframeExplanationProps) {
  const { t } = useLocale()

  if (!tier) {
    return null
  }

  const tierLabel = t(`editor.reframeTier.${tier}`)
  const noticeSummary = t("editor.reframeNoticeSummary")
  const notice = t("editor.reframeNotice")
  const noticeDetails = t("editor.reframeNoticeDetails")

  return (
    <details className="mt-4 rounded-2xl bg-blue-50/80 dark:bg-slate-900/60 border border-blue-200 dark:border-blue-500/40 p-4 text-sm text-blue-900 dark:text-blue-200 shadow-inner">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
          {tierLabel ?? noticeSummary}
        </span>
        <span className="text-sm text-blue-900 dark:text-blue-100">{noticeSummary}</span>
      </summary>
      <div className="mt-3 space-y-2 text-sm text-blue-900 dark:text-blue-200">
        <p>{notice}</p>
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{noticeDetails}</p>
      </div>
    </details>
  )
}
