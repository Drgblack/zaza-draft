"use client"

import { useState, useEffect } from "react"

export interface TeacherPrefs {
  firstName: string
  preferredTone: "Friendly" | "Professional" | "Formal"
  preferredLanguage: "en" | "de"
  lastDocType: "lesson-plan" | "email" | "report"
  streakCount: number
  lastActiveAt: string
}

const DEFAULT_PREFS: TeacherPrefs = {
  firstName: "Sarah",
  preferredTone: "Professional",
  preferredLanguage: "en",
  lastDocType: "lesson-plan",
  streakCount: 3,
  lastActiveAt: new Date().toISOString(),
}

export function useTeacherPrefs() {
  const [prefs, setPrefs] = useState<TeacherPrefs>(DEFAULT_PREFS)
  const [toneChangeCount, setToneChangeCount] = useState<Record<string, number>>({})

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem("teacherPrefs")
    if (stored) {
      try {
        setPrefs(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse teacher prefs", e)
      }
    }
  }, [])

  const updatePrefs = (updates: Partial<TeacherPrefs>) => {
    const newPrefs = { ...prefs, ...updates }
    setPrefs(newPrefs)
    localStorage.setItem("teacherPrefs", JSON.stringify(newPrefs))
  }

  const setPreferredTone = (tone: TeacherPrefs["preferredTone"]) => {
    // Track tone changes for nudge
    const count = (toneChangeCount[tone] || 0) + 1
    setToneChangeCount({ ...toneChangeCount, [tone]: count })

    updatePrefs({ preferredTone: tone })

    return count >= 2 // Return true if should show nudge
  }

  const setPreferredLanguage = (language: TeacherPrefs["preferredLanguage"]) => {
    updatePrefs({ preferredLanguage: language })
  }

  const setLastDocType = (docType: TeacherPrefs["lastDocType"]) => {
    updatePrefs({ lastDocType: docType, lastActiveAt: new Date().toISOString() })
  }

  const incrementStreak = () => {
    updatePrefs({ streakCount: prefs.streakCount + 1 })
  }

  return {
    prefs,
    setPreferredTone,
    setPreferredLanguage,
    setLastDocType,
    incrementStreak,
    updatePrefs,
  }
}
