"use client"

import { X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LanguageDetection } from "@/hooks/use-smart-suggestions"
import { useLanguage } from "@/contexts/language-context"

interface LanguageDetectionBannerProps {
  detection: LanguageDetection
  onDismiss: () => void
}

export function LanguageDetectionBanner({ detection, onDismiss }: LanguageDetectionBannerProps) {
  const { setLanguage } = useLanguage()

  if (!detection.shouldSuggestSwitch) return null

  const languageNames = {
    "en-GB": "English (UK)",
    "en-US": "English (US)",
    "de-DE": "German",
  }

  const handleSwitchLanguage = () => {
    setLanguage(detection.detected)
    onDismiss()
  }

  const handleDontAskAgain = () => {
    localStorage.setItem("languageDetectionDismissed", "true")
    onDismiss()
  }

  return (
    <div
      className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-lg p-3 mb-4 animate-in fade-in duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
            It looks like you're typing in {languageNames[detection.detected]}. Switch to{" "}
            {languageNames[detection.detected]}?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSwitchLanguage} className="bg-amber-600 hover:bg-amber-700 text-white">
              Switch to {languageNames[detection.detected]}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDismiss}
              className="border-amber-600 text-amber-600 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-900/20 bg-transparent"
            >
              Keep Current
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDontAskAgain}
              className="text-amber-600 dark:text-amber-400 text-xs"
            >
              Don't ask again
            </Button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded p-1 flex-shrink-0"
          aria-label="Dismiss language detection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
