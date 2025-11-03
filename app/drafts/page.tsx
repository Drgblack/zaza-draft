"use client"

import { useState, useEffect } from "react"
import { Star, Copy, Trash2, Calendar, FileText } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { DraftCardSkeleton } from "@/components/skeletons"
import { MobileNav } from "@/components/mobile-nav"
import { useFavorites } from "@/contexts/favorites-context"
import { StarButton } from "@/components/star-button"
import { SuccessToast } from "@/components/success-toast"
import { useRouter } from "next/navigation"

const mockDrafts = [
  {
    id: "draft-1",
    title: "Parent Meeting Follow-up",
    preview: "Dear Parent, Thank you for meeting with me yesterday to discuss...",
    date: "2025-01-15",
    tone: "Professional",
  },
  {
    id: "draft-2",
    title: "Homework Reminder",
    preview: "Hi there, I wanted to reach out about the missing assignment...",
    date: "2025-01-14",
    tone: "Warm",
  },
  {
    id: "draft-3",
    title: "Behavior Concern",
    preview: "Dear Parent, I'm writing to discuss a concern regarding...",
    date: "2025-01-13",
    tone: "Firm",
  },
]

export default function DraftsPage() {
  const { t } = useLanguage()
  const { getFavoritesByType } = useFavorites()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [successToast, setSuccessToast] = useState<{
    message: string
    type?: "success" | "info"
    icon?: "check" | "star" | "copy"
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const favoriteDrafts = getFavoritesByType("draft")
  const displayedDrafts = filterFavorites
    ? mockDrafts.filter((d) => favoriteDrafts.some((f) => f.itemId === d.id))
    : mockDrafts

  const handleStarToggle = (isFavorited: boolean) => {
    setSuccessToast({
      message: isFavorited ? "Added to favorites!" : "Removed from favorites",
      type: "success",
      icon: "star",
    })
  }

  const handleCopyDraft = (draftId: string) => {
    const draft = mockDrafts.find((d) => d.id === draftId)
    if (draft) {
      navigator.clipboard.writeText(draft.preview)
      setSuccessToast({
        message: "Draft copied to clipboard!",
        type: "success",
        icon: "copy",
      })
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row pb-16 lg:pb-0">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title={t.dashboard} subtitle={t.myDrafts} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <DraftCardSkeleton key={i} />
              ))}
            </div>
          ) : displayedDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
              {filterFavorites ? (
                <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              ) : (
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {filterFavorites ? "No favorites yet" : "No drafts yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                {filterFavorites
                  ? "Star your best drafts to save them here for quick reference"
                  : "Create your first draft to start tracking your teaching impact"}
              </p>
              <Button
                onClick={() => (filterFavorites ? setFilterFavorites(false) : router.push("/"))}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 min-h-[48px]"
              >
                {filterFavorites ? "View All Drafts" : "Create Your First Draft"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{draft.title}</h3>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded whitespace-nowrap">
                          {draft.tone}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{draft.preview}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(draft.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <StarButton itemId={draft.id} type="draft" onToggle={handleStarToggle} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyDraft(draft.id)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Copy draft"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        aria-label="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <MobileNav />

      {successToast && (
        <SuccessToast
          message={successToast.message}
          type={successToast.type}
          icon={successToast.icon}
          onClose={() => setSuccessToast(null)}
        />
      )}
    </div>
  )
}
