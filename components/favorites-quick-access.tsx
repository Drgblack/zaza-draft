"use client"

import { Star, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useFavorites } from "@/contexts/favorites-context"
import { Button } from "@/components/ui/button"

export function FavoritesQuickAccess() {
  const router = useRouter()
  const { getMostUsed, incrementUsage } = useFavorites()
  const mostUsed = getMostUsed(4)

  if (mostUsed.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No favorites yet</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Star your go-to templates for quick access</p>
        <Button onClick={() => router.push("/templates")} className="bg-purple-600 hover:bg-purple-700 text-white">
          Browse Templates
        </Button>
      </div>
    )
  }

  const handleUseTemplate = (itemId: string) => {
    incrementUsage(itemId)
    localStorage.setItem(
      "selectedTemplate",
      `Example template content loaded from favorites.\n\nDear Parent,\n\n[Template content here...]\n\nBest regards,\nSarah Johnson`,
    )
    router.push("/")
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Favorites</h3>
        </div>
        <button
          onClick={() => router.push("/templates?tab=favorites")}
          className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mostUsed.map((favorite) => (
          <div
            key={favorite.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {favorite.type === "template" ? "Template" : "Draft"} #{favorite.itemId.split("-")[1]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Used {favorite.usageCount} times</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleUseTemplate(favorite.itemId)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 h-auto"
              >
                Use
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
