"use client"

import { useState, useEffect } from "react"

import { useAuth } from "@/hooks/use-auth"

export interface TeacherPrefs {
  firstName: string
  profilePhoto: string | null
  preferredTone: "Friendly" | "Professional" | "Formal"
  preferredLanguage: "en" | "de"
  lastDocType: "lesson-plan" | "email" | "report"
  streakCount: number
  lastActiveAt: string
  signatureLine1?: string
  signatureLine2?: string
  signatureLine3?: string
  autoAppendSignatureParentMessage?: boolean
  autoAppendSignatureReportComment?: boolean
  includeDraftSignature?: boolean
}

const STORAGE_KEY_PREFIX = "teacher_prefs"

const LEGACY_STORAGE_KEY = STORAGE_KEY_PREFIX

function getPrefsStorageKey(uid: string | undefined | null) {
  if (!uid) return null
  return `${STORAGE_KEY_PREFIX}:${uid}`
}

function migrateLegacyPrefs(uid: string, newKey: string) {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (legacy) {
    localStorage.setItem(newKey, legacy)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return legacy
  }
  return null
}

const createDefaultPrefs = (): TeacherPrefs => ({
  firstName: "",
  profilePhoto: null,
  preferredTone: "Professional",
  preferredLanguage: "en",
  lastDocType: "lesson-plan",
  streakCount: 0,
  lastActiveAt: new Date().toISOString(),
  signatureLine1: "",
  signatureLine2: undefined,
  signatureLine3: undefined,
  autoAppendSignatureParentMessage: true,
  autoAppendSignatureReportComment: false,
  includeDraftSignature: undefined,
})

const DEFAULT_PREFS: TeacherPrefs = createDefaultPrefs()

function normalizePrefs(rawPrefs: Partial<TeacherPrefs> | null | undefined): TeacherPrefs {
  return {
    ...createDefaultPrefs(),
    ...(rawPrefs ?? {}),
  }
}



export function useTeacherPrefs() {
  const [prefs, setPrefs] = useState<TeacherPrefs>(DEFAULT_PREFS)
  const [toneChangeCount, setToneChangeCount] = useState<Record<string, number>>({})
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const loadStoredPrefs = () => {
      const key = getPrefsStorageKey(user?.uid)
    if (!key) { return }
 if (!key) { setPrefs(createDefaultPrefs()); return }
 if (!key) {
        setPrefs(createDefaultPrefs())
        return
      }

      const stored = localStorage.getItem(key)
      if (!stored) {
        setPrefs(createDefaultPrefs())
        return
      }

      try {
        setPrefs(normalizePrefs(JSON.parse(stored)))
      } catch (error) {
        console.error("Failed to parse teacher prefs", error)
        setPrefs(createDefaultPrefs())
      }
    }

    loadStoredPrefs()

    const handleStorageUpdate = () => {
      const key = getPrefsStorageKey(user?.uid)
    if (!key) { return }
 if (!key) { setPrefs(createDefaultPrefs()); return }
 if (!key) return
      const latest = localStorage.getItem(key)
      if (latest) {
        try {
          setPrefs(normalizePrefs(JSON.parse(latest)))
        } catch (error) {
          console.error("Failed to parse updated teacher prefs", error)
        }
      }
    }

    window.addEventListener("teacherPrefsUpdated", handleStorageUpdate)

    return () => {
      window.removeEventListener("teacherPrefsUpdated", handleStorageUpdate)
    }
  }, [user?.uid])

  const updatePrefs = (updates: Partial<TeacherPrefs>) => {
    const newPrefs = normalizePrefs({ ...prefs, ...updates })
    setPrefs(newPrefs)
    const key = getPrefsStorageKey(user?.uid)
   if (!key) { return }
 if (!key) { setPrefs(createDefaultPrefs()); return }
if (key) {
      localStorage.setItem(key, JSON.stringify(newPrefs))
    }
    window.dispatchEvent(new CustomEvent("teacherPrefsUpdated"))
  }

  const setPreferredTone = (tone: TeacherPrefs["preferredTone"]) => {
    const count = (toneChangeCount[tone] || 0) + 1
    setToneChangeCount({ ...toneChangeCount, [tone]: count })

    updatePrefs({ preferredTone: tone })

    return count >= 2
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


