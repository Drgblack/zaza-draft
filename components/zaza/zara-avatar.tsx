"use client"

import { cn } from "@/lib/utils"

import { useEffect, useState } from "react"

export function ZaraAvatar() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const handleRefresh = () => {
      setIsRefreshing(true)
      setTimeout(() => setIsRefreshing(false), 600)
    }

    // Listen for custom refresh event
    window.addEventListener("zara-refresh", handleRefresh)
    return () => window.removeEventListener("zara-refresh", handleRefresh)
  }, [])

  return (
    <div
      className={cn(
        "relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md transition-transform duration-300",
        isRefreshing && "animate-[tilt_0.6s_ease-in-out]",
      )}
      aria-label="Zara AI assistant avatar"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 opacity-0 animate-pulse" />
      <span className="text-white font-bold text-lg">Z</span>
    </div>
  )
}
