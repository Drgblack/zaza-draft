"use client"

import { CheckCircle, Sparkles, Clock, Flame, Heart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/confetti"
import { useState } from "react"

interface MilestoneModalProps {
  isOpen: boolean
  onClose: () => void
  milestone: {
    type:
      | "first-draft"
      | "5-week-streak"
      | "10-drafts"
      | "50-drafts"
      | "100-drafts"
      | "5-hours"
      | "20-hours"
      | "perfect-week"
    title: string
    description: string
    funFact?: string
  }
}

export function MilestoneModal({ isOpen, onClose, milestone }: MilestoneModalProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  if (!isOpen) return null

  const getIcon = () => {
    switch (milestone.type) {
      case "5-week-streak":
        return <Flame className="w-20 h-20 text-orange-500 animate-pulse" />
      case "first-draft":
        return <Sparkles className="w-20 h-20 text-purple-500 animate-pulse" />
      case "5-hours":
      case "20-hours":
        return <Clock className="w-20 h-20 text-green-500 animate-pulse" />
      case "perfect-week":
        return <Heart className="w-20 h-20 text-green-500 animate-pulse" />
      default:
        return <CheckCircle className="w-20 h-20 text-purple-500 animate-pulse" />
    }
  }

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} duration={3000} particleCount={50} />

      <div
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-300">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-6">{getIcon()}</div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🎉 Achievement Unlocked!</h2>

            <h3 className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-4">{milestone.title}</h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">{milestone.description}</p>

            {milestone.funFact && (
              <p className="text-sm text-gray-500 dark:text-gray-500 italic mb-6">{milestone.funFact}</p>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-6 text-lg"
            >
              Celebrate! 🎉
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
