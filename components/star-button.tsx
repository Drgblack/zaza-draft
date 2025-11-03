"use client"

import type React from "react"

import { Star } from "lucide-react"
import { useState } from "react"
import { useFavorites } from "@/contexts/favorites-context"

interface StarButtonProps {
  itemId: string
  type: "template" | "draft"
  onToggle?: (isFavorited: boolean) => void
  className?: string
  onSuccess?: (message: string) => void
}

export function StarButton({ itemId, type, onToggle, onSuccess, className = "" }: StarButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const [isAnimating, setIsAnimating] = useState(false)
  const favorited = isFavorite(itemId)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (favorited) {
      removeFavorite(itemId)
      onToggle?.(false)
      onSuccess?.("Removed from favorites")
    } else {
      addFavorite(type, itemId)
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 600)
      onToggle?.(true)
      onSuccess?.("Added to favorites!")
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`relative p-1.5 rounded-full transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${className}`}
      aria-label={favorited ? `Remove from favorites` : `Add to favorites`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={`w-5 h-5 transition-all duration-300 ${
          favorited ? "fill-yellow-500 text-yellow-500" : "text-gray-400 hover:text-yellow-500"
        } ${isAnimating ? "scale-125 rotate-12" : "scale-100"}`}
        aria-hidden="true"
      />

      {isAnimating && (
        <>
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-yellow-500 rounded-full animate-particle opacity-0"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 72}deg) translateY(-20px)`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </>
      )}
    </button>
  )
}
