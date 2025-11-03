"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface Favorite {
  id: string
  type: "template" | "draft"
  itemId: string
  userId: string
  createdAt: Date
  usageCount: number
  lastUsed: Date
  tags?: string[]
  collectionId?: string
}

interface FavoritesContextType {
  favorites: Favorite[]
  addFavorite: (type: "template" | "draft", itemId: string) => void
  removeFavorite: (itemId: string) => void
  isFavorite: (itemId: string) => boolean
  getFavoritesByType: (type: "template" | "draft") => Favorite[]
  incrementUsage: (itemId: string) => void
  getMostUsed: (limit?: number) => Favorite[]
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("favorites")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setFavorites(
          parsed.map((f: Favorite) => ({
            ...f,
            createdAt: new Date(f.createdAt),
            lastUsed: new Date(f.lastUsed),
          })),
        )
      } catch (error) {
        console.error("[v0] Failed to parse favorites:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("favorites", JSON.stringify(favorites))
    }
  }, [favorites, mounted])

  const addFavorite = (type: "template" | "draft", itemId: string) => {
    const newFavorite: Favorite = {
      id: `fav-${Date.now()}`,
      type,
      itemId,
      userId: "user-1", // TODO: Get from auth context
      createdAt: new Date(),
      usageCount: 0,
      lastUsed: new Date(),
    }
    setFavorites((prev) => [...prev, newFavorite])
  }

  const removeFavorite = (itemId: string) => {
    setFavorites((prev) => prev.filter((f) => f.itemId !== itemId))
  }

  const isFavorite = (itemId: string) => {
    return favorites.some((f) => f.itemId === itemId)
  }

  const getFavoritesByType = (type: "template" | "draft") => {
    return favorites.filter((f) => f.type === type).sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
  }

  const incrementUsage = (itemId: string) => {
    setFavorites((prev) =>
      prev.map((f) =>
        f.itemId === itemId
          ? {
              ...f,
              usageCount: f.usageCount + 1,
              lastUsed: new Date(),
            }
          : f,
      ),
    )
  }

  const getMostUsed = (limit = 5) => {
    return [...favorites].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit)
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        getFavoritesByType,
        incrementUsage,
        getMostUsed,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider")
  }
  return context
}
