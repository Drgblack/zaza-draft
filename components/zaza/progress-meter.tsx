"use client"

import { useLocale } from "@/hooks/use-locale"

interface ProgressMeterProps {
  used: number
  limit: number
}

export function ProgressMeter({ used, limit }: ProgressMeterProps) {
  const { t } = useLocale()
  const percentage = (used / limit) * 100
  const circumference = 2 * Math.PI * 16
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const remaining = limit - used

  return (
    <div className="flex items-center gap-3" title={`${remaining} free drafts left this week`}>
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-200 dark:text-slate-700"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-purple-600 dark:text-purple-400 transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{used}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("panel.progress.draftsUsed", { used, limit })}
        </p>
        <p className="text-xs text-purple-600 dark:text-purple-400">{t("panel.progress.polishing")}</p>
      </div>
    </div>
  )
}
