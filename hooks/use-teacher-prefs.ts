"use client"

import { useState, useEffect } from "react"

export interface TeacherPrefs {
  firstName: string
  profilePhoto: string | null
  preferredTone: "Friendly" | "Professional" | "Formal"
  preferredLanguage: "en" | "de"
  lastDocType: "lesson-plan" | "email" | "report"
  streakCount: number
  lastActiveAt: string
}

const DEFAULT_PREFS: TeacherPrefs = {
  firstName: "Sarah",
  profilePhoto: null,
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
    const loadStoredPrefs = () => {
      const stored = localStorage.getItem("teacherPrefs")
      if (stored) {
        try {
          setPrefs(JSON.parse(stored))
        } catch (e) {
          console.error("Failed to parse teacher prefs", e)
        }
      }
    }

    loadStoredPrefs()

    const handleStorageUpdate = () => {
      const latest = localStorage.getItem("teacherPrefs")
      if (latest) {
        try {
          setPrefs(JSON.parse(latest))
        } catch (e) {
          console.error("Failed to parse updated teacher prefs", e)
        }
      }
    }

    window.addEventListener("teacherPrefsUpdated", handleStorageUpdate)

    return () => {
      window.removeEventListener("teacherPrefsUpdated", handleStorageUpdate)
    }
  }, [])

  const updatePrefs = (updates: Partial<TeacherPrefs>) => {
    const newPrefs = { ...prefs, ...updates }
    setPrefs(newPrefs)
    localStorage.setItem("teacherPrefs", JSON.stringify(newPrefs))
    window.dispatchEvent(new CustomEvent("teacherPrefsUpdated"))
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
