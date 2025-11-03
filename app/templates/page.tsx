"use client"

import { useState, useEffect } from "react"
import { Star, Sparkles, BookOpen, MessageSquare, AlertCircle, FileText } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { TemplateCardSkeleton } from "@/components/skeletons"
import { MobileNav } from "@/components/mobile-nav"
import { useFavorites } from "@/contexts/favorites-context"
import { StarButton } from "@/components/star-button"
import { SuccessToast } from "@/components/success-toast"

const mockTemplates = [
  {
    id: "template-1",
    title: "Parent Meeting Invitation",
    description: "Invite parents to discuss their child's progress",
    category: "Academic",
    icon: MessageSquare,
    color: "from-blue-500 to-blue-700",
  },
  {
    id: "template-2",
    title: "Behavior Concern",
    description: "Address behavioral issues professionally",
    category: "Behavior",
    icon: AlertCircle,
    color: "from-orange-500 to-orange-700",
  },
  {
    id: "template-3",
    title: "Grade Explanation",
    description: "Explain grading decisions clearly",
    category: "Academic",
    icon: FileText,
    color: "from-purple-500 to-purple-700",
  },
  {
    id: "template-4",
    title: "Homework Reminder",
    description: "Gentle reminder about missing assignments",
    category: "Academic",
    icon: BookOpen,
    color: "from-green-500 to-green-700",
  },
  {
    id: "template-5",
    title: "Positive Feedback",
    description: "Celebrate student achievements",
    category: "Positive",
    icon: Sparkles,
    color: "from-pink-500 to-pink-700",
  },
  {
    id: "template-6",
    title: "Absence Follow-up",
    description: "Check in after student absence",
    category: "Wellbeing",
    icon: MessageSquare,
    color: "from-teal-500 to-teal-700",
  },
]

export default function TemplatesPage() {
  const { t } = useLanguage()
  const { getFavoritesByType, incrementUsage } = useFavorites()
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [successToast, setSuccessToast] = useState<{
    message: string
    type?: "success" | "info"
    icon?: "check" | "star"
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [activeTab])

  const favoriteTemplates = getFavoritesByType("template")
  const displayedTemplates =
    activeTab === "favorites"
      ? mockTemplates.filter((t) => favoriteTemplates.some((f) => f.itemId === t.id))
      : mockTemplates

  const handleUseTemplate = (templateId: string) => {
    incrementUsage(templateId)
    const template = mockTemplates.find((t) => t.id === templateId)
    if (template) {
      localStorage.setItem(
        "selectedTemplate",
        `Example template content for: ${template.title}\n\nDear Parent,\n\n[Template content here...]\n\nBest regards,\nSarah Johnson`,
      )
      window.location.href = "/"
    }
  }

  const handleStarToggle = (isFavorited: boolean) => {
    setSuccessToast({
      message: isFavorited ? "Added to favorites!" : "Removed from favorites",
      type: "success",
      icon: "star",
    })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row pb-16 lg:pb-0">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title={t.dashboard} subtitle={t.templates} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap min-h-[44px] ${
                activeTab === "all"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              All Templates
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                activeTab === "favorites"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              My Favorites
              {favoriteTemplates.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-yellow-500 text-white rounded-full">
                  {favoriteTemplates.length}
                </span>
              )}
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <TemplateCardSkeleton key={i} />
              ))}
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Star className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                {t.emptyStates.noFavorites}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                {t.emptyStates.noFavoritesDesc}
              </p>
              <Button
                onClick={() => setActiveTab("all")}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                Browse Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {displayedTemplates.map((template) => {
                const Icon = template.icon
                return (
                  <div
                    key={template.id}
                    className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg transition-all duration-200 group"
                  >
                    <div className="absolute top-3 right-3 z-10">
                      <StarButton itemId={template.id} type="template" onToggle={handleStarToggle} />
                    </div>

                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center mb-4`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-8">{template.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {template.category}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                )
              })}
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

      <style jsx global>{`
        @keyframes particle {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-30px);
          }
        }
        .animate-particle {
          animation: particle 600ms ease-out forwards;
        }
      `}</style>
    </div>
  )
}
