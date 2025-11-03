"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SituationDetection } from "@/hooks/use-smart-suggestions"

interface SituationDetectionBannerProps {
  situation: SituationDetection
  onUseTemplate: (templateName: string) => void
  onDismiss: () => void
}

export function SituationDetectionBanner({ situation, onUseTemplate, onDismiss }: SituationDetectionBannerProps) {
  return (
    <div
      className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-3 mb-4 animate-in fade-in duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {situation.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">{situation.message}</p>
          <div className="flex flex-wrap gap-2">
            {situation.suggestedTemplates.slice(0, 3).map((template) => (
              <Button
                key={template}
                size="sm"
                variant="outline"
                onClick={() => onUseTemplate(template)}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20 text-xs"
              >
                {template}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                /* Navigate to templates */
              }}
              className="text-blue-600 dark:text-blue-400 text-xs"
            >
              View All →
            </Button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1 flex-shrink-0"
          aria-label="Dismiss situation detection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
