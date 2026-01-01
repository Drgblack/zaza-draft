"use client"

// Copy rules: UK English; keep the tone supportive, never scolding or suggesting wrongdoing; avoid naming "banned words."
import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
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
  useEffect(() => {
    setExpanded(false)
  }, [summary])

  if (!summary.wasDeescalated) {
    return null
  }

  const phrases = summary.flaggedPhrases.slice(0, 5)

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">Calmed and professionalised</p>
          <p className="text-sm text-slate-600">
            I softened a few high-emotion phrases to keep this message safe and effective.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={detailsId}
        >
          {expanded ? "Hide changes" : "See what changed"}
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
                <span className="font-semibold text-slate-900">Original:</span> {phrase.originalSnippet}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold text-slate-900">Calmer alternative:</span>{" "}
                {phrase.suggestionSnippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
