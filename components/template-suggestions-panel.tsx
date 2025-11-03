"use client"

import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TemplateSuggestion } from "@/hooks/use-smart-suggestions"

interface TemplateSuggestionsPanelProps {
  suggestions: TemplateSuggestion[]
  onUseTemplate: (templateId: string) => void
  onDismiss: () => void
}

export function TemplateSuggestionsPanel({ suggestions, onUseTemplate, onDismiss }: TemplateSuggestionsPanelProps) {
  if (suggestions.length === 0) return null

  return (
    <div
      className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-3 mb-4 animate-in fade-in duration-200"
      role="region"
      aria-label="Template suggestions"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Suggested templates ✨</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded p-1"
          aria-label="Dismiss suggestions"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-lg p-3 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{suggestion.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">{suggestion.preview}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">{suggestion.matchReason}</p>
              </div>
              <Button
                size="sm"
                onClick={() => onUseTemplate(suggestion.id)}
                className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Use Template
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
