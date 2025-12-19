"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { TrendingUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function InsightsFAB() {
  const [isVisible, setIsVisible] = useState(false)
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    // Check if user has visited insights in the last 7 days
    const lastVisit = localStorage.getItem("lastInsightsVisit")
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    if (!lastVisit || Number.parseInt(lastVisit) < sevenDaysAgo) {
      setShowBadge(true)
    }

    // Show FAB after a short delay
    setTimeout(() => setIsVisible(true), 1000)
  }, [])

  const handleClick = () => {
    localStorage.setItem("lastInsightsVisit", Date.now().toString())
    setShowBadge(false)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsVisible(false)
    // Remember dismissal for 24 hours
    localStorage.setItem("insightsFABDismissed", (Date.now() + 24 * 60 * 60 * 1000).toString())
  }

  if (!isVisible) return null

  return (
    <Link href="/insights" onClick={handleClick}>
      <div className="fixed bottom-6 right-6 z-50 group" role="button" aria-label="View Your Impact">
        <Button
          size="lg"
          className="h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white animate-pulse-slow"
        >
          <TrendingUp className="h-5 w-5 mr-2" aria-hidden="true" />
          <span className="font-semibold">View Your Impact</span>
        </Button>

        {showBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
            New
          </span>
        )}

        <button
          onClick={handleDismiss}
          className="absolute -top-2 -left-2 bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </Link>
  )
}
