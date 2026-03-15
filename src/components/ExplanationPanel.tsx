"use client"

type RiskLevel = "low" | "medium" | "high"

interface ExplanationPanelProps {
  explanationLines: string[]
  riskLevel: RiskLevel
}

export function ExplanationPanel({ explanationLines, riskLevel }: ExplanationPanelProps) {
  if (riskLevel !== "high" || explanationLines.length === 0) {
    return null
  }

  const visibleLines = explanationLines.slice(0, 4)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Why Zaza adjusted this message:
      </p>
      <ul className="mt-3 space-y-2">
        {visibleLines.map((line, index) => (
          <li
            key={`${line}-${index}`}
            className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
          >
            <span aria-hidden="true" className="mt-0.5 text-slate-500 dark:text-slate-400">
              •
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
