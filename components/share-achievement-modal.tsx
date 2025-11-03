"use client"

import { useState } from "react"
import { X, Copy, Download, Check, Linkedin, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateAchievementImage } from "@/lib/export-utils"

interface ShareAchievementModalProps {
  isOpen: boolean
  onClose: () => void
  achievement: {
    name: string
    description: string
    icon: string
  }
}

export function ShareAchievementModal({ isOpen, onClose, achievement }: ShareAchievementModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const shareUrl = `https://zazadraft.com/achievement/${achievement.name.toLowerCase().replace(/\s+/g, "-")}`
  const shareText = `I just unlocked the ${achievement.name} achievement on Zaza Draft! 🎉`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("[v0] Copy failed:", error)
    }
  }

  const handleDownloadImage = async () => {
    try {
      const blob = await generateAchievementImage(achievement.name, "Sarah Johnson")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `zaza-achievement-${achievement.name.toLowerCase().replace(/\s+/g, "-")}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Download failed:", error)
    }
  }

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(url, "_blank", "width=600,height=600")
  }

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, "_blank", "width=600,height=600")
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-achievement-title"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-4xl">
            {achievement.icon}
          </div>
          <h2 id="share-achievement-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Share Your Achievement
          </h2>
          <p className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-1">{achievement.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full justify-start bg-transparent"
            aria-label={copied ? "Link copied" : "Copy link to clipboard"}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>

          <Button
            onClick={handleShareLinkedIn}
            variant="outline"
            className="w-full justify-start bg-transparent"
            aria-label="Share on LinkedIn"
          >
            <Linkedin className="w-4 h-4 mr-2" />
            Share on LinkedIn
          </Button>

          <Button
            onClick={handleShareTwitter}
            variant="outline"
            className="w-full justify-start bg-transparent"
            aria-label="Share on Twitter"
          >
            <Twitter className="w-4 h-4 mr-2" />
            Share on Twitter/X
          </Button>

          <Button
            onClick={handleDownloadImage}
            variant="outline"
            className="w-full justify-start bg-transparent"
            aria-label="Download as image"
          >
            <Download className="w-4 h-4 mr-2" />
            Download as Image
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Only share what you're comfortable with
        </p>
      </div>
    </div>
  )
}
