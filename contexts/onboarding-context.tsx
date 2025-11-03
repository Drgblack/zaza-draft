"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface OnboardingData {
  firstName: string
  lastName: string
  school: string
  gradeLevel: string[]
  subjects: string[]
  workingHoursStart: string
  workingHoursEnd: string
  weekendTracking: "track-remind" | "track-only" | "no-track"
  eveningThreshold: string
  defaultTone: "warm" | "professional" | "direct" | "empathetic"
  completedSteps: number[]
  hasCompletedOnboarding: boolean
  hasTriedFirstDraft: boolean
}

interface OnboardingContextType {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  completeStep: (step: number) => void
  skipOnboarding: () => void
  resumeOnboarding: () => void
  isOnboardingComplete: boolean
  shouldShowOnboarding: boolean
}

const defaultData: OnboardingData = {
  firstName: "",
  lastName: "",
  school: "",
  gradeLevel: [],
  subjects: [],
  workingHoursStart: "08:00",
  workingHoursEnd: "18:00",
  weekendTracking: "track-remind",
  eveningThreshold: "18:00",
  defaultTone: "warm",
  completedSteps: [],
  hasCompletedOnboarding: false,
  hasTriedFirstDraft: false,
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData)
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false)

  useEffect(() => {
    // Load onboarding data from localStorage
    const stored = localStorage.getItem("zaza-onboarding")
    if (stored) {
      const parsed = JSON.parse(stored)
      setData(parsed)
      // Show onboarding if not completed
      setShouldShowOnboarding(!parsed.hasCompletedOnboarding)
    } else {
      // First time user - show onboarding
      setShouldShowOnboarding(true)
    }
  }, [])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates }
      localStorage.setItem("zaza-onboarding", JSON.stringify(newData))
      return newData
    })
  }

  const completeStep = (step: number) => {
    setData((prev) => {
      const completedSteps = [...new Set([...prev.completedSteps, step])]
      const newData = { ...prev, completedSteps }
      localStorage.setItem("zaza-onboarding", JSON.stringify(newData))
      return newData
    })
  }

  const skipOnboarding = () => {
    setShouldShowOnboarding(false)
    const updatedData = { ...data, hasCompletedOnboarding: true }
    setData(updatedData)
    localStorage.setItem("zaza-onboarding", JSON.stringify(updatedData))
  }

  const resumeOnboarding = () => {
    setShouldShowOnboarding(true)
  }

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        completeStep,
        skipOnboarding,
        resumeOnboarding,
        isOnboardingComplete: data.hasCompletedOnboarding,
        shouldShowOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return context
}
