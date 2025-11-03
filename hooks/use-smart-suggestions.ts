"use client"

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/contexts/language-context"

export interface TemplateSuggestion {
  id: string
  name: string
  preview: string
  matchReason: string
  category: string
  score: number
}

export interface SituationDetection {
  type: "behavior" | "academic" | "positive" | "meeting" | "homework" | null
  confidence: number
  icon: string
  message: string
  recommendedTone: string
  suggestedTemplates: string[]
}

export interface LanguageDetection {
  detected: "en-GB" | "en-US" | "de-DE"
  confidence: number
  shouldSuggestSwitch: boolean
}

export function useSmartSuggestions() {
  const { language } = useLanguage()
  const [isEnabled, setIsEnabled] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([])
  const [situationDetected, setSituationDetected] = useState<SituationDetection | null>(null)
  const [languageDetected, setLanguageDetected] = useState<LanguageDetection | null>(null)
  const [lastAnalyzedText, setLastAnalyzedText] = useState("")
  const [usagePatterns, setUsagePatterns] = useState<Record<string, number>>({})

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("smartSuggestionsSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setIsEnabled(settings.enabled ?? true)
    }

    const savedPatterns = localStorage.getItem("usagePatterns")
    if (savedPatterns) {
      setUsagePatterns(JSON.parse(savedPatterns))
    }
  }, [])

  // Detect situation type from text
  const detectSituation = useCallback((text: string): SituationDetection | null => {
    const lowerText = text.toLowerCase()

    // Behavior concern detection
    const behaviorKeywords = [
      "behavior",
      "behaviour",
      "acting out",
      "disrupting",
      "talking",
      "not following",
      "inappropriate",
      "misbehaving",
      "disruptive",
    ]
    const behaviorScore = behaviorKeywords.filter((kw) => lowerText.includes(kw)).length

    // Academic struggle detection
    const academicKeywords = [
      "struggling",
      "difficulty",
      "behind",
      "not understanding",
      "needs help",
      "low grade",
      "failing",
      "poor performance",
    ]
    const academicScore = academicKeywords.filter((kw) => lowerText.includes(kw)).length

    // Positive update detection
    const positiveKeywords = [
      "great",
      "excellent",
      "improved",
      "progress",
      "proud",
      "well done",
      "achievement",
      "success",
      "wonderful",
    ]
    const positiveScore = positiveKeywords.filter((kw) => lowerText.includes(kw)).length

    // Meeting request detection
    const meetingKeywords = ["meeting", "conference", "discuss", "chat", "talk", "schedule", "available", "appointment"]
    const meetingScore = meetingKeywords.filter((kw) => lowerText.includes(kw)).length

    // Homework issue detection
    const homeworkKeywords = ["homework", "assignment", "missing", "incomplete", "not submitted", "late", "overdue"]
    const homeworkScore = homeworkKeywords.filter((kw) => lowerText.includes(kw)).length

    // Determine highest scoring category
    const scores = [
      { type: "behavior" as const, score: behaviorScore, threshold: 2 },
      { type: "academic" as const, score: academicScore, threshold: 2 },
      { type: "positive" as const, score: positiveScore, threshold: 2 },
      { type: "meeting" as const, score: meetingScore, threshold: 2 },
      { type: "homework" as const, score: homeworkScore, threshold: 2 },
    ]

    const detected = scores.find((s) => s.score >= s.threshold)

    if (!detected) return null

    const situationMap = {
      behavior: {
        icon: "⚠️",
        message: "Looks like a behavior concern—try these templates:",
        recommendedTone: "professional",
        suggestedTemplates: ["Classroom Behavior", "Disruption Follow-up", "Behavior Concern"],
      },
      academic: {
        icon: "📚",
        message: "Sounds like an academic concern. These templates might help:",
        recommendedTone: "warm",
        suggestedTemplates: ["Academic Struggle", "Extra Support Needed", "Progress Update"],
      },
      positive: {
        icon: "⭐",
        message: "Celebrating success! Try these positive templates:",
        recommendedTone: "warm",
        suggestedTemplates: ["Positive Update", "Achievement Celebration", "Great Progress"],
      },
      meeting: {
        icon: "📅",
        message: "Planning a meeting? These templates can help:",
        recommendedTone: "professional",
        suggestedTemplates: ["Conference Invitation", "Meeting Request", "Schedule Discussion"],
      },
      homework: {
        icon: "📝",
        message: "Following up on work. Try these templates:",
        recommendedTone: "professional",
        suggestedTemplates: ["Homework Reminder", "Missing Assignment", "Work Completion"],
      },
    }

    return {
      type: detected.type,
      confidence: Math.min(detected.score / 4, 1),
      ...situationMap[detected.type],
    }
  }, [])

  // Detect language from text
  const detectLanguage = useCallback(
    (text: string): LanguageDetection | null => {
      if (text.length < 20) return null

      const germanWords = ["der", "die", "das", "und", "ist", "nicht", "mit", "für", "auf", "von"]
      const englishWords = ["the", "and", "is", "not", "with", "for", "on", "from", "that", "this"]

      const words = text.toLowerCase().split(/\s+/)
      const germanCount = words.filter((w) => germanWords.includes(w)).length
      const englishCount = words.filter((w) => englishWords.includes(w)).length

      let detected: "en-GB" | "en-US" | "de-DE" = "en-GB"
      let confidence = 0

      if (germanCount > englishCount && germanCount >= 2) {
        detected = "de-DE"
        confidence = Math.min(germanCount / words.length, 1)
      } else if (englishCount >= 2) {
        detected = language === "en-US" ? "en-US" : "en-GB"
        confidence = Math.min(englishCount / words.length, 1)
      }

      const shouldSuggestSwitch = detected !== language && confidence > 0.7

      return {
        detected,
        confidence,
        shouldSuggestSwitch,
      }
    },
    [language],
  )

  // Analyze text and provide suggestions
  const analyzeSituation = useCallback(
    (text: string) => {
      if (!isEnabled || text.length < 15) {
        setShowSuggestions(false)
        setSituationDetected(null)
        setLanguageDetected(null)
        return
      }

      // Debounce: only analyze if text has changed significantly
      if (Math.abs(text.length - lastAnalyzedText.length) < 5) {
        return
      }

      setLastAnalyzedText(text)

      // Detect situation
      const situation = detectSituation(text)
      setSituationDetected(situation)

      // Detect language
      const lang = detectLanguage(text)
      setLanguageDetected(lang)

      // Generate template suggestions based on keywords
      const mockSuggestions: TemplateSuggestion[] = []

      if (situation) {
        situation.suggestedTemplates.forEach((template, index) => {
          mockSuggestions.push({
            id: `template-${index}`,
            name: template,
            preview: `A professional template for ${situation.type} situations...`,
            matchReason: `Based on keywords: '${situation.type}'`,
            category: situation.type,
            score: 10 - index,
          })
        })
      }

      if (mockSuggestions.length > 0) {
        setSuggestions(mockSuggestions.slice(0, 3))
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    },
    [isEnabled, lastAnalyzedText, detectSituation, detectLanguage],
  )

  // Track template usage for pattern learning
  const trackTemplateUsage = useCallback((templateId: string) => {
    setUsagePatterns((prev) => {
      const updated = { ...prev, [templateId]: (prev[templateId] || 0) + 1 }
      localStorage.setItem("usagePatterns", JSON.stringify(updated))
      return updated
    })
  }, [])

  // Dismiss suggestions
  const dismissSuggestions = useCallback(() => {
    setShowSuggestions(false)
  }, [])

  // Dismiss situation detection
  const dismissSituation = useCallback(() => {
    setSituationDetected(null)
  }, [])

  // Dismiss language detection
  const dismissLanguageDetection = useCallback(() => {
    setLanguageDetected(null)
  }, [])

  return {
    isEnabled,
    showSuggestions,
    suggestions,
    situationDetected,
    languageDetected,
    analyzeSituation,
    trackTemplateUsage,
    dismissSuggestions,
    dismissSituation,
    dismissLanguageDetection,
  }
}
