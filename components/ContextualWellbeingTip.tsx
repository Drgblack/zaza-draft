"use client"

import type React from "react"

import { Lightbulb, X, Sparkles, Moon, Heart, Target, Clock } from "lucide-react"
import { useState, useEffect } from "react"

interface WellbeingTip {
  id: string
  icon: React.ReactNode
  text: string
  type: "time" | "usage" | "achievement" | "welcome"
}

interface TipContext {
  draftsToday: number
  draftsThisWeek: number
  editDepthChange: number
  timeOfDay: "morning" | "afternoon" | "evening"
  dayOfWeek: string
  isWeekend: boolean
  currentStreak: number
  recentTonePreference: string
}

const DISMISS_STORAGE_KEY = "zaza_wellbeing_tip_dismissed"

function checkUserData(): boolean {
  // In production, this would check actual user data
  // For now, return true to show personalized tips
  // Set to false for new users with <3 drafts
  return true
}

function selectPersonalizedTip(context: TipContext, hasEnoughData: boolean): WellbeingTip {
  if (!hasEnoughData) {
    return {
      id: "welcome",
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      text: "Welcome! Zara will learn your patterns and offer personalized tips as you go.",
      type: "welcome",
    }
  }

  if (context.isWeekend && context.draftsToday <= 2) {
    return {
      id: "weekend-healthy",
      icon: <Heart className="w-4 h-4 text-green-500" />,
      text: `Weekend draft #${context.draftsToday}. Excellent job protecting your boundaries!`,
      type: "time",
    }
  }

  if (context.draftsToday >= 5) {
    return {
      id: "momentum-break",
      icon: <Target className="w-4 h-4 text-purple-500" />,
      text: `You've drafted ${context.draftsToday} messages today. Great momentum! Consider a short break?`,
      type: "usage",
    }
  }

  if (context.editDepthChange < -10) {
    return {
      id: "confidence-growing",
      icon: <Sparkles className="w-4 h-4 text-orange-500" />,
      text: `Your editing depth dropped ${Math.abs(context.editDepthChange)}% this month. Growing confidence!`,
      type: "achievement",
    }
  }

  if (context.timeOfDay === "evening" && !context.isWeekend) {
    return {
      id: "evening-suggestion",
      icon: <Moon className="w-4 h-4 text-purple-500" />,
      text: "Evening work? Your best drafts typically happen in afternoons.",
      type: "time",
    }
  }

  if (context.timeOfDay === "afternoon" && context.dayOfWeek === "Tuesday") {
    return {
      id: "peak-flow",
      icon: <Sparkles className="w-4 h-4 text-orange-500" />,
      text: "You're in your flow zone! Tuesday afternoons are your sweet spot.",
      type: "time",
    }
  }

  if (context.draftsThisWeek >= 15) {
    const timeSaved = (context.draftsThisWeek * 0.25).toFixed(1)
    return {
      id: "time-celebration",
      icon: <Clock className="w-4 h-4 text-purple-500" />,
      text: `You saved ${timeSaved}h this week. That's precious time back for yourself.`,
      type: "achievement",
    }
  }

  return {
    id: "default",
    icon: <Lightbulb className="w-4 h-4 text-purple-500" />,
    text: "Tip: Using 'Empathetic' tone first often saves regeneration time.",
    type: "usage",
  }
}

export function ContextualWellbeingTip() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentTip, setCurrentTip] = useState<WellbeingTip | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showWellbeingInsights, setShowWellbeingInsights] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const showInsights = localStorage.getItem("show_wellbeing_insights")
    if (showInsights === "false") {
      setShowWellbeingInsights(false)
    }
  }, [])

  useEffect(() => {
    if (!showWellbeingInsights) return

    // Check if tip was dismissed today
    const dismissedDate = localStorage.getItem(DISMISS_STORAGE_KEY)
    if (dismissedDate) {
      const today = new Date().toDateString()
      const dismissedDay = new Date(dismissedDate).toDateString()

      if (today === dismissedDay) {
        setIsDismissed(true)
        return
      }
    }

    // Check if user has sufficient data for personalized tips
    const hasEnoughData = checkUserData()

    const hour = new Date().getHours()
    const day = new Date().getDay()
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    // Mock user data - in production, fetch from API
    const context: TipContext = {
      draftsToday: 2,
      draftsThisWeek: 18,
      editDepthChange: -12,
      timeOfDay: hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening",
      dayOfWeek: dayNames[day],
      isWeekend: [0, 6].includes(day),
      currentStreak: 5,
      recentTonePreference: "Empathetic",
    }

    const tip = selectPersonalizedTip(context, hasEnoughData)
    setCurrentTip(tip)

    // Gentle delay - feels like Zara noticed you
    const timer = setTimeout(
      () => {
        setIsVisible(true)
      },
      prefersReducedMotion ? 0 : 1800,
    )

    return () => clearTimeout(timer)
  }, [showWellbeingInsights, prefersReducedMotion])

  const handleDismiss = () => {
    setIsVisible(false)
    const now = new Date().toISOString()
    localStorage.setItem(DISMISS_STORAGE_KEY, now)
    setIsDismissed(true)

    // Optional: Send telemetry
    // console.log('[v0] Wellbeing tip dismissed:', { tipId: currentTip?.id, timestamp: now })
  }

  if (!showWellbeingInsights || isDismissed || !isVisible || !currentTip) return null

  const animationClass = prefersReducedMotion ? "" : "animate-gentle-notice"

  return (
    <div
      className={`${animationClass} mb-4 glass shadow-[0_8px_28px_rgba(0,0,0,0.12)] border-l-4 border-purple-700 dark:border-purple-400 rounded-r-xl transition-all duration-200 hover:shadow-[0_12px_32px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 bg-white/90 dark:bg-white/15 backdrop-blur-[32px]`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 py-3 px-4">
        <div className="flex-shrink-0" aria-hidden="true">
          {currentTip.icon}
        </div>

        <p
          className="flex-1 text-sm text-gray-900 dark:text-white dark:!text-white leading-relaxed font-medium"
          aria-hidden="true"
        >
          {currentTip.text}
        </p>

        <span className="sr-only">Wellbeing tip: {currentTip.text}</span>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-700 dark:text-gray-200 dark:!text-gray-200 hover:text-gray-900 dark:hover:text-white dark:hover:!text-white transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 rounded"
          aria-label="Dismiss wellbeing tip"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
