"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"

interface PersonalizationContextValue {
  showPersonalizedGreeting: boolean
  setShowPersonalizedGreeting: (show: boolean) => void
}

const PersonalizationContext = createContext<PersonalizationContextValue | null>(null)

export function usePersonalization() {
  const context = useContext(PersonalizationContext)
  if (!context) {
    throw new Error("usePersonalization must be used within a PersonalizationProvider")
  }
  return context
}

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [showPersonalizedGreeting, setShowPersonalizedGreetingState] = useState(() => {
    if (typeof window === "undefined") return true
    const saved = localStorage.getItem("zaza.personalizedGreeting")
    return saved === null ? true : saved === "true"
  })

  useEffect(() => {
    localStorage.setItem("zaza.personalizedGreeting", showPersonalizedGreeting.toString())
  }, [showPersonalizedGreeting])

  const setShowPersonalizedGreeting = (show: boolean) => {
    setShowPersonalizedGreetingState(show)
  }

  return (
    <PersonalizationContext.Provider value={{ showPersonalizedGreeting, setShowPersonalizedGreeting }}>
      {children}
    </PersonalizationContext.Provider>
  )
}
