"use client"

import { useState, type MouseEvent } from "react"

import { useLocale } from "@/hooks/use-locale"

type ReframeTier = "tier1" | "tier2" | "tier3"

interface ReframeExplanationProps {
  tier?: ReframeTier | null
}

export function ReframeExplanation({ tier }: ReframeExplanationProps) {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const handleSummaryClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    setIsOpen((previous) => !previous)
  }

  if (!tier) {
    return null
  }

  const tierLabel = t(`editor.reframeTier.${tier}`)
  const noticeSummary = t("editor.reframeNoticeSummary")
  const notice = t("editor.reframeNotice")
  const noticeDetails = t("editor.reframeNoticeDetails")
  const showLabel = t("editor.reframeShowChanges")
  const hideLabel = t("editor.reframeHideChanges")

  const toggleLabel = isOpen ? hideLabel : showLabel

  return (
    <details
      data-testid="reframe-explanation"
      open={isOpen}
      className="mt-4 rounded-2xl bg-blue-50/80 dark:bg-slate-900/60 border border-blue-200 dark:border-blue-500/40 p-4 text-sm text-blue-900 dark:text-blue-200 shadow-inner"
    >
      <summary
        className="flex cursor-pointer items-center justify-between gap-4 text-left"
        aria-expanded={isOpen}
        onClick={handleSummaryClick}
      >
        <div className="space-y-1 text-left">
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-600 dark:border-blue-500/70 dark:bg-slate-900/80 dark:text-blue-300">
            {tierLabel}
          </span>
          <p className="text-base font-semibold leading-5 text-blue-900 dark:text-blue-50">{noticeSummary}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold uppercase text-blue-700 dark:text-blue-200">
          {toggleLabel}
          <span
            aria-hidden="true"
            className={`inline-block text-base transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </span>
      </summary>
      <div className="mt-4 space-y-4 text-sm text-blue-900/90 dark:text-blue-200 max-h-[220px] overflow-y-auto pr-2">
        <p>{notice}</p>
        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{noticeDetails}</p>
      </div>
    </details>
  )
}
