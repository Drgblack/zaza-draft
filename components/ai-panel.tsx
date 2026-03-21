"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ArrowUp, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SuggestionCard } from "./suggestion-card"
import { ExplainTab } from "./explain-tab"
import { HistoryTab } from "./history-tab"
import { UpgradeButton } from "./zaza/upgrade-button"
import { ZaraAvatar } from "./zaza/zara-avatar"
import { ProgressMeter } from "./zaza/progress-meter"
import type { Suggestion } from "@/lib/types"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import { FREE_TIER_LIMIT } from "@/lib/usage"

interface AiPanelProps {
  suggestions: Suggestion[]
  onSuggestionAction: (id: string, action: "accept" | "insert_as_comment" | "dismiss") => void
  onCollapse: () => void
  documentType?: "lesson-plan" | "email" | "report"
  isLoading?: boolean
}

export function AiPanel({
  suggestions,
  onSuggestionAction,
  onCollapse,
  documentType = "lesson-plan",
  isLoading = false,
}: AiPanelProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [activeTab, setActiveTab] = useState("suggestions")
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [headerPulse, setHeaderPulse] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { prefs } = useTeacherPrefs()
  const { t } = useLocale()

  const isFreeUser = true
  const draftsUsed = Math.max(FREE_TIER_LIMIT - 1, 0)
  const draftsLimit = FREE_TIER_LIMIT

  const newSuggestions = suggestions.filter((s) => !s.viewed).sort((a, b) => b.confidence - a.confidence)
  const viewedSuggestions = suggestions.filter((s) => s.viewed).sort((a, b) => b.confidence - a.confidence)

  useEffect(() => {
    if (newSuggestions.length > 0) {
      setHeaderPulse(true)
      const timer = setTimeout(() => setHeaderPulse(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [newSuggestions.length])

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      setShowScrollTop(scrollContainer.scrollTop > 200)
    }

    scrollContainer.addEventListener("scroll", handleScroll)
    return () => scrollContainer.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div
      className="zara-panel h-full flex flex-col border-l border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 overflow-hidden"
      role="complementary"
      aria-label={t("panel.title")}
      data-testid="zara-panel"
    >
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none z-0" />

      <div className="relative z-10 p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t("panel.title")}</h2>
        </div>
        <div className="flex items-center gap-2">
          {isFreeUser && <UpgradeButton snippetsUsed={draftsUsed} snippetsLimit={draftsLimit} variant="compact" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            aria-label={t("collapseAiPanel")}
            className="hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-purple-400 dark:focus-visible:ring-purple-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="suggestions"
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden relative z-10"
      >
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-3 relative bg-transparent">
          <TabsTrigger
            value="suggestions"
            className="relative transition-all hover:text-purple-600 dark:hover:text-purple-400 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-xl"
            role="tab"
            aria-selected={activeTab === "suggestions"}
          >
            {t("panel.tabs.suggestions")}
          </TabsTrigger>
          <TabsTrigger
            value="explain"
            className="relative transition-all hover:text-purple-600 dark:hover:text-purple-400 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-xl"
            role="tab"
            aria-selected={activeTab === "explain"}
          >
            {t("panel.tabs.explain")}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="relative transition-all hover:text-purple-600 dark:hover:text-purple-400 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 rounded-xl"
            role="tab"
            aria-selected={activeTab === "history"}
          >
            {t("panel.tabs.history")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="flex-1 mt-0 flex flex-col relative overflow-hidden">
          <div className="flex-1 zara-panel__scroll pr-2" ref={scrollAreaRef} data-testid="zara-scroll">
            <div className="px-4 py-3 flex items-center gap-3">
              <ZaraAvatar />
              <p className="text-sm font-medium text-gray-700 dark:text-[var(--text-primary)]">
                {t("panel.zara.suggests")}
              </p>
            </div>

            <div
              data-role="sticky-header"
              className={`sticky top-0 z-10 bg-gray-50/90 dark:bg-[var(--bg-panel)]/90 backdrop-blur supports-[backdrop-filter]:bg-transparent px-4 py-2 border-b border-gray-200/50 dark:border-[var(--border-subtle)] transition-all duration-300 ${
                headerPulse ? "shadow-lg shadow-purple-500/20" : ""
              }`}
            >
              <span className="text-[11px] uppercase tracking-wider font-medium text-gray-500 dark:text-[var(--text-secondary)]">
                {t("newSuggestions")}
              </span>
            </div>

            <div className="px-3 md:px-4 pb-4 pt-3 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="skeleton h-32 rounded-xl" />
                  <div className="skeleton h-32 rounded-xl" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                  {t("emptySuggestions")}
                </div>
              ) : (
                <>
                  {newSuggestions.length > 0 && (
                    <div className="space-y-3">
                      {newSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.id}
                          className="animate-in fade-in slide-in-from-top-4 duration-300"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <SuggestionCard
                            suggestion={suggestion}
                            onAction={(action) => onSuggestionAction(suggestion.id, action)}
                            onSelect={() => setSelectedSuggestion(suggestion)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {viewedSuggestions.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="text-[11px] uppercase tracking-wider font-medium text-gray-500 dark:text-[var(--text-secondary)] px-1">
                        {t("panel.card.previouslyViewed")}
                      </h3>
                      {viewedSuggestions.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          onAction={(action) => onSuggestionAction(suggestion.id, action)}
                          onSelect={() => setSelectedSuggestion(suggestion)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {showScrollTop && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-4 right-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 z-10 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={scrollToTop}
              aria-label={t("scrollToTop")}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </TabsContent>

        <TabsContent value="explain" className="flex-1 mt-0 overflow-y-auto overflow-x-hidden">
          <ExplainTab selectedSuggestion={selectedSuggestion} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-0 overflow-y-auto overflow-x-hidden">
          <HistoryTab />
        </TabsContent>
      </Tabs>

      <div className="border-t border-gray-200 dark:border-slate-800 px-4 py-3 bg-gray-50 dark:bg-slate-900">
        <ProgressMeter used={draftsUsed} limit={draftsLimit} />
      </div>
    </div>
  )
}
