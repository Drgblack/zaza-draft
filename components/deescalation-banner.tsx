"use client"

// Copy rules: UK English; keep the tone supportive, never scolding or suggesting wrongdoing; avoid naming "banned words."
import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/use-locale"
import type { DeescalationSummary } from "@/lib/deescalation/types"

const CATEGORY_LABELS: Record<DeescalationSummary["flaggedPhrases"][number]["category"], string> = {
  insult: "Insult",
  sarcasm: "Sarcasm",
  threat: "Threat",
  absolute: "Absolute language",
  inflammatory: "Inflammatory label",
  profanity: "Profanity",
}

interface DeescalationBannerProps {
  summary: DeescalationSummary
}

export function DeescalationBanner({ summary }: DeescalationBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const { t } = useLocale()

  useEffect(() => {
    setExpanded(false)
  }, [summary])

  if (!summary.wasDeescalated) {
    return null
  }

  const phrases = summary.flaggedPhrases.slice(0, 5)

  const handleToggle = () => {
    setExpanded((prev) => !prev)
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{t("deescalation.title")}</p>
          <p className="text-sm text-slate-600">{t("deescalation.description")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
        >
          {expanded ? t("deescalation.button.hide") : t("deescalation.button.show")}
        </Button>
      </div>

      {expanded && (
        <div id={detailsId} className="mt-4 space-y-4 text-slate-700">
          {phrases.map((phrase, index) => (
            <div
              key={`${phrase.originalSnippet}-${index}`}
              className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm mb-6"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <span>{CATEGORY_LABELS[phrase.category]}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 mt-3">
                {t("deescalation.diff.original")}
              </p>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                {phrase.originalSnippet}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-4 mb-1">
                {t("deescalation.diff.suggestion")}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 italic pl-3 border-l-2 border-blue-200 dark:border-blue-800">
                {phrase.suggestionSnippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
