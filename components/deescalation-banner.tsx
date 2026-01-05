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
  onToggleDiffView?: (open: boolean) => void
}

export function DeescalationBanner({ summary, onToggleDiffView }: DeescalationBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const { t } = useLocale()

  useEffect(() => {
    setExpanded(false)
    onToggleDiffView?.(false)
  }, [summary, onToggleDiffView])

  if (!summary.wasDeescalated) {
    return null
  }

  const phrases = summary.flaggedPhrases.slice(0, 5)

  const handleToggle = () => {
    setExpanded((prev) => {
      const next = !prev
      onToggleDiffView?.(next)
      return next
    })
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
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
        <div id={detailsId} className="mt-4 space-y-3 text-slate-700">
          {phrases.map((phrase, index) => (
            <div key={`${phrase.originalSnippet}-${index}`} className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <span>{CATEGORY_LABELS[phrase.category]}</span>
              </div>
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-900">{t("deescalation.diff.original")}</span>{" "}
                {phrase.originalSnippet}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold text-slate-900">{t("deescalation.diff.suggestion")}</span>{" "}
                {phrase.suggestionSnippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
