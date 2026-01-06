"use client"

import type React from "react"

import { useState } from "react"
import { Check, MessageSquare, ChevronDown, ChevronUp, MoreVertical, RotateCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Suggestion } from "@/lib/types"
import { getConfidenceLabel } from "@/lib/types"
import { useLocale } from "@/hooks/use-locale"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface SuggestionCardProps {
  suggestion: Suggestion
  onAction: (action: "accept" | "insert_as_comment" | "dismiss") => void
  onSelect: () => void
}

export function SuggestionCard({ suggestion, onAction, onSelect }: SuggestionCardProps) {
  const [showRationale, setShowRationale] = useState(false)
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
  const [isApplying, setIsApplying] = useState(false)
  const { t } = useLocale()

  const confidenceLabel = getConfidenceLabel(suggestion.confidence)
  const isHighConfidence = suggestion.confidence >= 0.8
  const isMediumConfidence = suggestion.confidence >= 0.5 && suggestion.confidence < 0.8
  const isLowConfidence = suggestion.confidence < 0.5

  const getHelperText = () => {
    if (isHighConfidence) return t("panel.helper.high")
    if (isMediumConfidence) return t("panel.helper.medium")
    return t("panel.helper.low")
  }

  const exampleAlternatives = [
    "Consider rephrasing this section to improve clarity and flow.",
    "This passage could benefit from more concise language.",
    "Try restructuring this sentence for better readability.",
  ]

  const getBadgeClasses = () => {
    if (isHighConfidence) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
    }
    if (isMediumConfidence) {
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
    }
    return "bg-gray-100 text-gray-800 dark:bg-slate-700/60 dark:text-gray-200"
  }

  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsApplying(true)
    await onAction("accept")
    setTimeout(() => setIsApplying(false), 800)
  }

  const handleNextExample = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentExampleIndex((prev) => (prev + 1) % exampleAlternatives.length)
  }

  if (isLowConfidence) {
    return (
      <Card
        className="p-3 transition-all duration-200 cursor-pointer hover:bg-purple-50/40 dark:hover:bg-purple-500/5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:translate-y-[-2px] bg-white dark:bg-slate-800 animate-in fade-in slide-in-from-bottom-2"
        style={{ animationDelay: `${Math.random() * 40}ms` }}
        onClick={onSelect}
        data-kind="suggestion"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-[15px] font-medium text-gray-800 dark:text-gray-100 flex-1">{suggestion.title}</h4>
              <span
                className={cn(
                  "inline-flex items-center h-6 px-2 rounded-md text-xs font-medium shrink-0",
                  getBadgeClasses(),
                )}
              >
                {t("panel.card.low")}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">{getHelperText()}</p>
            <p className="text-[15px] leading-snug text-gray-700 dark:text-gray-300 line-clamp-2">
              {suggestion.rationale}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "p-3 md:p-4 transition-all duration-200 cursor-pointer hover:bg-purple-50/40 dark:hover:bg-purple-500/5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:translate-y-[-2px] bg-white dark:bg-slate-800",
        "focus:outline-none focus:ring-2 focus:ring-purple-400/50 dark:focus:ring-purple-300/40",
        "animate-in fade-in slide-in-from-bottom-2",
      )}
      style={{ animationDelay: `${Math.random() * 40}ms` }}
      onClick={onSelect}
      data-kind="suggestion"
      tabIndex={0}
      role="article"
      aria-label={`Suggestion: ${suggestion.title}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[15px] font-medium text-gray-800 dark:text-gray-100 flex-1">{suggestion.title}</h4>
          <span
            className={cn(
              "inline-flex items-center h-6 px-2 rounded-md text-xs font-medium shrink-0",
              getBadgeClasses(),
            )}
            data-confidence={isHighConfidence ? "high" : "medium"}
          >
            {t(`panel.card.${confidenceLabel.toLowerCase()}` as any)}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{getHelperText()}</p>

        <div
          className="text-[15px] leading-snug p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600"
          dangerouslySetInnerHTML={{ __html: suggestion.diffHtml }}
        />

        <div className="space-y-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowRationale(!showRationale)
            }}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full"
            aria-expanded={showRationale}
            aria-label={showRationale ? "Hide explanation" : "Show explanation"}
          >
            {showRationale ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="font-medium">{t("panel.card.whyZaraHelps")}</span>
          </button>

          {showRationale && (
            <div className="text-[15px] leading-snug text-gray-700 dark:text-gray-300 pl-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
              <p>{suggestion.rationale}</p>

              <div className="mt-2 space-y-2">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 text-sm text-gray-700 dark:text-gray-300">
                  {exampleAlternatives[currentExampleIndex]}
                </div>
                <button
                  onClick={handleNextExample}
                  className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                  aria-label="Show next example"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {t("panel.examples.nextExample")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleApply}
            loading={isApplying}
            disabled={isApplying}
            leftIcon={!isApplying ? <Sparkles className="h-4 w-4 text-white" /> : undefined}
            rightIcon={!isApplying ? <Check className="h-4 w-4 text-white" /> : undefined}
            className="flex-1 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-purple-400"
            aria-label="Apply this suggestion"
          >
            {t("panel.card.use")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => e.stopPropagation()}
                aria-label="More options"
                className="rounded-xl border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAction("insert_as_comment")
                }}
                className="rounded-lg"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t("panel.card.insertAsComment")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAction("dismiss")
                }}
                className="text-destructive rounded-lg"
              >
                {t("panel.card.notQuiteRight")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}
