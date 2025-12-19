"use client"

import { useState, useEffect, useRef, useMemo } from "react"

interface RotatingTaglineProps {
  taglines?: string[]
  intervalMs?: number
  className?: string
}

const DEFAULT_TAGLINES = [
  "Write with heart. Teach with clarity.",
  "Less typing. More teaching.",
  "Write with empathy. Teach with impact.",
  "Your calm corner for parent messages.",
]

export default function RotatingTagline({
  taglines = DEFAULT_TAGLINES,
  intervalMs = 7000,
  className = "",
}: RotatingTaglineProps) {
  const [index, setIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const isPausedRef = useRef(false)

  // Memoize taglines array to prevent unnecessary re-renders
  const stableTaglines = useMemo(() => taglines, [taglines])

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    // If reduced motion is preferred, don't rotate
    if (prefersReducedMotion) {
      return
    }

    // Track visibility state
    const handleVisibilityChange = () => {
      isPausedRef.current = document.visibilityState !== "visible"
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Single persistent interval that checks pause state on each tick
    const tick = () => {
      // Skip if paused (hover or tab hidden)
      if (isPausedRef.current) return

      // Start fade out
      setIsFading(true)

      // After fade out completes, swap text and fade in
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % stableTaglines.length)
        setIsFading(false)
      }, 300)
    }

    const intervalId = setInterval(tick, intervalMs)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [intervalMs, stableTaglines.length, prefersReducedMotion])

  // If reduced motion is preferred, show only the first tagline
  if (prefersReducedMotion) {
    return <p className={`text-xs md:text-sm text-muted-foreground ${className}`}>{stableTaglines[0]}</p>
  }

  return (
    <div
      className={className}
      onMouseEnter={() => {
        isPausedRef.current = true
      }}
      onMouseLeave={() => {
        isPausedRef.current = false
      }}
    >
      {/* Animated text - hidden from screen readers */}
      <span
        aria-hidden="true"
        className={`inline-block transition-opacity duration-500 ${isFading ? "opacity-0" : "opacity-100"}`}
      >
        {stableTaglines[index]}
      </span>

      {/* Static fallback for screen readers */}
      <span className="sr-only">{stableTaglines[0]}</span>
    </div>
  )
}
