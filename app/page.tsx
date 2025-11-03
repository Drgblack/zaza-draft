"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Search,
  Clock,
  Flame,
  Heart,
  Home,
  FileText,
  BarChart3,
  Database,
  Users,
  SettingsIcon,
  Sparkles,
  X,
  Loader2,
  Info,
  AlertCircle,
  CheckCircle,
  Copy,
  RotateCcw,
  Edit3,
  ArrowRight,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/contexts/language-context"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { ZaraHelp } from "@/components/zara-help"
import { ErrorToast } from "@/components/error-toast"
import { Confetti } from "@/components/confetti"
import { MilestoneModal } from "@/components/milestone-modal"
import { SuccessToast } from "@/components/success-toast"
import { MobileNav } from "@/components/mobile-nav"
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal"
import { NotificationBell } from "@/components/notification-bell"
import { ExportDraftMenu } from "@/components/export-draft-menu"
import { useUndoRedo } from "@/hooks/use-undo-redo"
import { RevertDraftModal } from "@/components/revert-draft-modal"
import { FavoritesQuickAccess } from "@/components/favorites-quick-access"
import { useSmartSuggestions } from "@/hooks/use-smart-suggestions"
import { TemplateSuggestionsPanel } from "@/components/template-suggestions-panel"
import { SituationDetectionBanner } from "@/components/situation-detection-banner"
import { LanguageDetectionBanner } from "@/components/language-detection-banner"
import { MetricCardSkeleton, EditorSkeleton } from "@/components/skeletons"
import { ProfileDropdown } from "@/components/profile-dropdown"

export default function Dashboard() {
  const { t } = useLanguage()
  const {
    state: selectedTone,
    set: setSelectedTone,
    undo: undoTone,
    redo: redoTone,
    canUndo: canUndoTone,
    canRedo: canRedoTone,
  } = useUndoRedo<string>("professional")
  const [situation, setSituation] = useState("")
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useKeyboardShortcuts()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDraft, setGeneratedDraft] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showZaraHelp, setShowZaraHelp] = useState(false)
  const [errorToast, setErrorToast] = useState<{
    message: string
    type: "success" | "error" | "warning" | "info"
  } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const MAX_CHARS = 2000
  const MIN_CHARS = 10

  const [showConfetti, setShowConfetti] = useState(false)
  const [showMilestone, setShowMilestone] = useState(false)
  const [successToast, setSuccessToast] = useState<{
    message: string
    type?: "success" | "info" | "achievement"
    icon?: "check" | "star" | "copy" | "settings"
  } | null>(null)
  const [showZaraCongrats, setShowZaraCongrats] = useState(false)
  const [copyButtonState, setCopyButtonState] = useState<"idle" | "copied">("idle")
  const [draftsCreated, setDraftsCreated] = useState(0)

  const [originalDraft, setOriginalDraft] = useState("")
  const [draftVersions, setDraftVersions] = useState<string[]>([])
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false)
  const [isDraftEdited, setIsDraftEdited] = useState(false)

  const [showWelcomeBar, setShowWelcomeBar] = useState(true)

  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const [isOnline, setIsOnline] = useState(true)
  const [showSessionExpired, setShowSessionExpired] = useState(false)

  const {
    showSuggestions,
    suggestions,
    situationDetected,
    languageDetected,
    analyzeSituation,
    trackTemplateUsage,
    dismissSuggestions,
    dismissSituation,
    dismissLanguageDetection,
  } = useSmartSuggestions()

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 600) // 600ms loading duration

    return () => clearTimeout(loadingTimer)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setErrorToast({
        message: "You're back online!",
        type: "success",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setErrorToast({
        message: "You're offline. Please check your connection.",
        type: "error",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    const loadedTemplate = localStorage.getItem("selectedTemplate")
    if (loadedTemplate) {
      setSituation(loadedTemplate)
      localStorage.removeItem("selectedTemplate")
      setSuccessToast({
        message: "Template loaded successfully!",
        type: "success",
        icon: "check",
      })
    }

    const savedDraftsCount = localStorage.getItem("draftsCreated")
    if (savedDraftsCount) {
      setDraftsCreated(Number.parseInt(savedDraftsCount, 10))
    }

    const welcomeBarDismissed = localStorage.getItem("welcomeBarDismissed")
    if (welcomeBarDismissed === "true") {
      setShowWelcomeBar(false)
    }
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    const userName = "Sarah" // TODO: Pull from profile/settings context

    if (hour >= 5 && hour < 12) {
      return {
        greeting: `Good morning, ${userName} 👋`,
        subtext: "Ready to tackle the day?",
      }
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: `Good afternoon, ${userName} 👋`,
        subtext: "Keep up the great work.",
      }
    } else if (hour >= 17 && hour < 24) {
      return {
        greeting: `Good evening, ${userName} 👋`,
        subtext: "Let's keep it crisp and professional.",
      }
    } else {
      return {
        greeting: `Hello, ${userName} 👋`,
        subtext: "Let's keep it crisp and professional.",
      }
    }
  }

  const handleDismissWelcomeBar = () => {
    setShowWelcomeBar(false)
    localStorage.setItem("welcomeBarDismissed", "true")
  }

  const tones = [
    { id: "professional", label: t.professional },
    { id: "warm", label: t.warm },
    { id: "firm", label: t.firm },
    { id: "empathetic", label: t.empathetic },
  ]

  const handleGenerateDraft = async () => {
    setValidationError(null)
    setShowZaraHelp(false)

    if (!isOnline) {
      setErrorToast({
        message: "You're offline. Please check your connection.",
        type: "error",
      })
      return
    }

    const trimmedSituation = situation.trim()

    if (!trimmedSituation) {
      setValidationError(t.errors.descriptionEmpty)
      setShowZaraHelp(true)
      return
    }

    if (trimmedSituation.length < MIN_CHARS) {
      setValidationError(t.errors.descriptionTooShort)
      setShowZaraHelp(true)
      return
    }

    if (trimmedSituation.length > MAX_CHARS) {
      setValidationError(t.errors.descriptionTooLong)
      return
    }

    if (!selectedTone) {
      setValidationError(t.errors.noToneSelected)
      setShowZaraHelp(true)
      return
    }

    setIsGenerating(true)
    setGeneratedDraft("")
    setShowSuccess(false)

    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          const random = Math.random()
          if (random < 0.05) {
            reject(new Error("API Error"))
          } else if (random < 0.08) {
            reject(new Error("Session Expired"))
          } else {
            resolve(true)
          }
        }, 3500)
      })

      const mockDraft = `Dear Parent,

Thank you for reaching out regarding your child's recent essay grade. I understand your concern and would like to provide some clarity.

The essay received a C grade primarily because it did not follow the provided rubric and was submitted after the deadline. As outlined in our class syllabus, late submissions result in a grade reduction, and adherence to the rubric is essential for achieving higher marks.

I encourage your child to review the rubric and resubmit the essay for partial credit. I'm also available during office hours to discuss strategies for improvement.

Best regards,
Sarah Johnson`

      setGeneratedDraft(mockDraft)
      setIsGenerating(false)
      setShowSuccess(true)
      setRetryCount(0)

      setShowConfetti(true)

      const newCount = draftsCreated + 1
      setDraftsCreated(newCount)
      localStorage.setItem("draftsCreated", newCount.toString())

      if (newCount === 1) {
        setTimeout(() => {
          setShowMilestone(true)
          setShowZaraCongrats(true)
        }, 2000)
      }

      setTimeout(() => setShowSuccess(false), 5000)

      setOriginalDraft(mockDraft)
      setDraftVersions([mockDraft])
      setCurrentVersionIndex(0)
      setIsDraftEdited(false)
    } catch (error) {
      console.error("[v0] Draft generation failed:", error)
      setIsGenerating(false)

      if (error instanceof Error && error.message === "Session Expired") {
        setShowSessionExpired(true)
        setTimeout(() => {
          window.location.href = "/login"
        }, 3000)
        return
      }

      setRetryCount((prev) => prev + 1)

      if (retryCount >= 2) {
        setErrorToast({
          message: t.errors.stillHavingTrouble,
          type: "error",
        })
      } else {
        setErrorToast({
          message: "Unable to generate draft. Please try again.",
          type: "error",
        })
      }
      setShowZaraHelp(true)
    }
  }

  const handleRevertToOriginal = () => {
    setGeneratedDraft(originalDraft)
    setIsDraftEdited(false)
    setSuccessToast({
      message: "Reverted to original draft",
      type: "success",
      icon: "check",
    })
  }

  const handleDraftEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedDraft(e.target.value)
    setIsDraftEdited(e.target.value !== originalDraft)
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const newDraft = `Dear Parent,

I appreciate you reaching out about your child's essay grade. Let me clarify the grading criteria.

The essay received a C because it didn't align with the rubric requirements and was submitted past the deadline. Our syllabus clearly states that late work incurs a penalty, and following the rubric is crucial for higher grades.

I'd be happy to discuss this further and offer guidance for improvement. Your child is welcome to revise and resubmit for partial credit.

Warm regards,
Sarah Johnson`

      const newVersions = [...draftVersions, newDraft]
      setDraftVersions(newVersions)
      setCurrentVersionIndex(newVersions.length - 1)
      setGeneratedDraft(newDraft)
      setIsDraftEdited(false)

      setSuccessToast({
        message: "New draft version generated!",
        type: "success",
        icon: "check",
      })
    } catch (error) {
      console.error("[v0] Regeneration failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreviousVersion = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1
      setCurrentVersionIndex(newIndex)
      setGeneratedDraft(draftVersions[newIndex])
      setIsDraftEdited(false)
    }
  }

  const handleNextVersion = () => {
    if (currentVersionIndex < draftVersions.length - 1) {
      const newIndex = currentVersionIndex + 1
      setCurrentVersionIndex(newIndex)
      setGeneratedDraft(draftVersions[newIndex])
      setIsDraftEdited(false)
    }
  }

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(generatedDraft)
      setCopyButtonState("copied")
      setSuccessToast({
        message: "Copied to clipboard!",
        type: "success",
        icon: "copy",
      })

      setTimeout(() => {
        setCopyButtonState("idle")
      }, 2000)
    } catch (error) {
      console.error("[v0] Failed to copy:", error)
      setErrorToast({
        message: "Failed to copy to clipboard",
        type: "error",
      })
    }
  }

  const handleSituationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setSituation(value)
    setCharCount(value.length)

    analyzeSituation(value)

    if (validationError) {
      setValidationError(null)
      setShowZaraHelp(false)
    }
  }

  const handleToneSelect = (toneId: string) => {
    setSelectedTone(toneId)

    if (validationError === t.errors.noToneSelected) {
      setValidationError(null)
      setShowZaraHelp(false)
    }
  }

  const handleUseTemplate = (templateId: string) => {
    trackTemplateUsage(templateId)
    dismissSuggestions()
    dismissSituation()

    // Mock: Load template content
    setSituation(`Template content for ${templateId}...`)
    setSuccessToast({
      message: "Template loaded successfully!",
      type: "success",
      icon: "check",
    })
  }

  const handleRetry = () => {
    setErrorToast(null)
    setValidationError(null)
    handleGenerateDraft()
  }

  const applyFormatting = (command: string, value?: string) => {
    if (!textareaRef) return

    const start = textareaRef.selectionStart
    const end = textareaRef.selectionEnd
    const selectedText = situation.substring(start, end)
    let newText = situation

    switch (command) {
      case "bold":
        newText = situation.substring(0, start) + `**${selectedText}**` + situation.substring(end)
        break
      case "italic":
        newText = situation.substring(0, start) + `*${selectedText}*` + situation.substring(end)
        break
      case "underline":
        newText = situation.substring(0, start) + `__${selectedText}__` + situation.substring(end)
        break
      case "bulletList":
        newText = situation.substring(0, start) + `\n• ${selectedText}` + situation.substring(end)
        break
      case "numberedList":
        newText = situation.substring(0, start) + `\n1. ${selectedText}` + situation.substring(end)
        break
      case "heading":
        newText = situation.substring(0, start) + `\n## ${selectedText}` + situation.substring(end)
        break
    }

    setSituation(newText)
    setCharCount(newText.length)

    // Restore focus and selection
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus()
        const newCursorPos =
          command === "bold" || command === "italic" || command === "underline"
            ? start + 2
            : start + (command === "heading" ? 4 : 3)
        textareaRef.setSelectionRange(newCursorPos, newCursorPos + selectedText.length)
      }
    }, 0)
  }

  const handleUndo = () => {
    if (textareaRef) {
      document.execCommand("undo")
    }
  }

  const handleRedo = () => {
    if (textareaRef) {
      document.execCommand("redo")
    }
  }

  useEffect(() => {
    const handleEditorShortcuts = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && situation.trim() && !isGenerating) {
        e.preventDefault()
        handleGenerateDraft()
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault()
        window.location.href = "/templates"
      }

      const target = e.target as HTMLElement
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && target.tagName !== "TEXTAREA") {
        e.preventDefault()
        if (canUndoTone) {
          undoTone()
          setSuccessToast({
            message: "Tone change undone",
            type: "info",
            icon: "check",
          })
        }
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        ((e.shiftKey && e.key === "z") || e.key === "y") &&
        target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault()
        if (canRedoTone) {
          redoTone()
          setSuccessToast({
            message: "Tone change redone",
            type: "info",
            icon: "check",
          })
        }
      }

      // Rich text shortcuts
      if (e.target === textareaRef) {
        if ((e.metaKey || e.ctrlKey) && e.key === "b") {
          e.preventDefault()
          applyFormatting("bold")
        } else if ((e.metaKey || e.ctrlKey) && e.key === "i") {
          e.preventDefault()
          applyFormatting("italic")
        } else if ((e.metaKey || e.ctrlKey) && e.key === "u") {
          e.preventDefault()
          applyFormatting("underline")
        } else if ((e.metaKey || e.ctrlKey) && e.key === "l") {
          e.preventDefault()
          applyFormatting("bulletList")
        } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "L") {
          e.preventDefault()
          applyFormatting("numberedList")
        } else if ((e.metaKey || e.ctrlKey) && e.key === "h") {
          e.preventDefault()
          applyFormatting("heading")
        }
      }

      const toneIds = ["professional", "warm", "firm", "empathetic"]
      const currentIndex = toneIds.indexOf(selectedTone)
      const nextIndex = (currentIndex + 1) % toneIds.length
      if (e.key === "Tab" && target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") {
        setSelectedTone(toneIds[nextIndex])
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleEditorShortcuts)
    return () => window.removeEventListener("keydown", handleEditorShortcuts)
  }, [situation, selectedTone, isGenerating, canUndoTone, canRedoTone, undoTone, redoTone, textareaRef])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row pb-16 lg:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <MilestoneModal
        isOpen={showMilestone}
        onClose={() => setShowMilestone(false)}
        milestone={{
          type: "first-draft",
          title: "Your First Draft!",
          description:
            "You've created your first draft with Zaza! This is just the beginning - you're going to love how much time this saves you.",
          funFact: "Most teachers save 10-15 minutes per draft. That adds up fast!",
        }}
      />

      {successToast && (
        <SuccessToast
          message={successToast.message}
          type={successToast.type}
          icon={successToast.icon}
          onClose={() => setSuccessToast(null)}
        />
      )}

      {showSessionExpired && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 id="session-expired-title" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Session Expired
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your session has expired. Please log in again to continue.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => (window.location.href = "/login")}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Log In Again
              </Button>
            </div>
          </div>
        </div>
      )}

      <aside
        className="hidden lg:flex w-64 border-r border-gray-200 dark:border-gray-800 p-6 flex-col"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2 mb-8">
          <Image
            src="/z-logo.png"
            alt="Zaza Draft logo"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
            loading="eager"
            priority
          />
          <span className="font-semibold text-gray-900 dark:text-white">Zaza Draft</span>
        </div>

        <div className="mb-6">
          <div className="relative" role="search">
            <label htmlFor="sidebar-search" className="sr-only">
              Search drafts and templates
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input
              id="sidebar-search"
              placeholder={t.searchAnything}
              className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              aria-label="Search drafts and templates"
            />
          </div>
        </div>

        <nav className="space-y-1 flex-1" aria-label="Main navigation">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            aria-current="page"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            {t.overview}
          </Link>
          <Link
            href="/drafts"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            {t.myDrafts}
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            {t.analytics}
          </Link>
          <Link
            href="/templates"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <Database className="w-4 h-4" aria-hidden="true" />
            {t.templates}
          </Link>
          <Link
            href="/community"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            {t.community}
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <SettingsIcon className="w-4 h-4" aria-hidden="true" />
            {t.settings}
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-4" role="banner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-2 lg:hidden">
                <Image
                  src="/z-logo.png"
                  alt="Zaza Draft logo"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-lg"
                  loading="eager"
                  priority
                />
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Zaza Draft</span>
              </div>
              <div className="hidden lg:flex items-center gap-4">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t.dashboard}</h1>
                <span className="text-gray-400" aria-hidden="true">
                  /
                </span>
                <span className="text-gray-600 dark:text-gray-400">{t.overview}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:block relative w-60 lg:w-80" role="search">
                <label htmlFor="header-search" className="sr-only">
                  Search drafts and templates
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <Input
                  id="header-search"
                  placeholder={t.searchPlaceholder}
                  className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                  title="Press / to focus"
                  aria-label="Search drafts and templates"
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-600 hidden lg:block"
                  aria-hidden="true"
                >
                  ⌘K
                </span>
              </div>
              <LanguageSelector />
              <ThemeToggle />
              <NotificationBell />
              <ProfileDropdown onOpenKeyboardShortcuts={() => setIsShortcutsModalOpen(true)} />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto" role="main">
          <section aria-labelledby="metrics-heading" className="mb-6 sm:mb-8">
            <h2 id="metrics-heading" className="sr-only">
              Your teaching metrics
            </h2>
            {isInitialLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div
                  className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-4 sm:p-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-purple-500/50 z-0"
                  role="article"
                  aria-label="Time saved this week: 17% increase"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Clock className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-3xl sm:text-4xl font-bold leading-none mb-1"
                        aria-label="17 percent increase"
                      >
                        {t.timeSavedValue}
                      </div>
                      <div className="text-sm sm:text-base font-semibold leading-tight mb-1">{t.timeSavedTitle}</div>
                      <div className="text-xs sm:text-sm text-purple-100 leading-tight opacity-90">
                        {t.timeSavedDesc}
                      </div>
                    </div>
                  </div>
                  <span className="sr-only">
                    You've saved 17% more time this week, that's 3 fewer emails on Sunday evening
                  </span>
                </div>

                <div
                  className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-4 sm:p-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-orange-500/50 z-0"
                  role="article"
                  aria-label="Current streak: 5 weeks"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Flame className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-3xl sm:text-4xl font-bold leading-none mb-1">{t.streakValue}</div>
                      <div className="text-sm sm:text-base font-semibold leading-tight mb-1">{t.streakTitle}</div>
                      <div className="text-xs sm:text-sm text-orange-100 leading-tight opacity-90">{t.streakDesc}</div>
                    </div>
                  </div>
                  <span className="sr-only">You've maintained a 5 week streak, your best yet</span>
                </div>

                <div
                  className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 sm:p-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-green-500/50 sm:col-span-2 lg:col-span-1 z-0"
                  role="article"
                  aria-label="Boundaries kept: 85%"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Heart className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-3xl sm:text-4xl font-bold leading-none mb-1">{t.boundariesValue}</div>
                      <div className="text-sm sm:text-base font-semibold leading-tight mb-1">{t.boundariesTitle}</div>
                      <div className="text-xs sm:text-sm text-green-100 leading-tight opacity-90">
                        {t.boundariesDesc}
                      </div>
                    </div>
                  </div>
                  <span className="sr-only">
                    You've kept 85% of your boundaries, weekend draft number 2, excellent balance
                  </span>
                </div>
              </div>
            )}
          </section>

          {!isInitialLoading && showWelcomeBar && (
            <div
              className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm my-6 animate-in fade-in duration-300"
              role="banner"
              aria-label="Welcome message"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-8 sm:pr-0">
                <div className="flex-1">
                  <h2 id="welcome-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-0.5">
                    {getGreeting().greeting}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{getGreeting().subtext}</p>
                </div>

                <Link
                  href="/analytics"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-500 rounded-lg font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 whitespace-nowrap"
                  aria-label="View full insights in analytics page"
                >
                  {t.viewFullInsights}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <button
                onClick={handleDismissWelcomeBar}
                className="absolute top-2 right-2 w-8 h-8 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                aria-label="Dismiss welcome message"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {!isInitialLoading && <FavoritesQuickAccess />}

          <section aria-labelledby="editor-heading">
            <h2 id="editor-heading" className="sr-only">
              Draft editor
            </h2>
            {isInitialLoading ? (
              <EditorSkeleton />
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 lg:p-8">
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-3 flex items-center gap-1 flex-wrap">
                  <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
                    <button
                      onClick={() => applyFormatting("bold")}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Bold (⌘B)"
                      aria-label="Make text bold"
                      disabled={isGenerating}
                    >
                      <Bold className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => applyFormatting("italic")}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Italic (⌘I)"
                      aria-label="Make text italic"
                      disabled={isGenerating}
                    >
                      <Italic className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => applyFormatting("underline")}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Underline (⌘U)"
                      aria-label="Underline text"
                      disabled={isGenerating}
                    >
                      <Underline className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
                    <button
                      onClick={() => applyFormatting("bulletList")}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Bullet list"
                      aria-label="Create bullet list"
                      disabled={isGenerating}
                    >
                      <List className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => applyFormatting("numberedList")}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Numbered list"
                      aria-label="Create numbered list"
                      disabled={isGenerating}
                    >
                      <ListOrdered className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => applyFormatting("heading")}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Heading"
                      aria-label="Make text a heading"
                      disabled={isGenerating}
                    >
                      <Heading className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleUndo}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Undo (⌘Z)"
                      aria-label="Undo last change"
                      disabled={isGenerating}
                    >
                      <Undo className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={handleRedo}
                      className="w-8 h-8 p-1.5 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                      title="Redo (⌘⇧Z)"
                      aria-label="Redo last change"
                      disabled={isGenerating}
                    >
                      <Redo className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <label htmlFor="situation-textarea" className="sr-only">
                  Describe the situation you need help with
                </label>
                <Textarea
                  id="situation-textarea"
                  ref={(el) => setTextareaRef(el)}
                  placeholder={`Describe the situation...

Examples:
• Year 6 student struggling with fractions, needs encouraging feedback
• Parent email about homework concerns, professional and empathetic tone
• Report card comment for excellent progress in reading comprehension`}
                  value={situation}
                  onChange={handleSituationChange}
                  className={`min-h-[180px] sm:min-h-[200px] mb-2 text-base bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:border-purple-500 focus-visible:shadow-lg transition-all duration-200 ${
                    validationError && validationError !== t.errors.noToneSelected
                      ? "border-red-500 dark:border-red-400 ring-2 ring-red-500/20 animate-shake"
                      : ""
                  }`}
                  style={{ fontSize: "16px" }}
                  disabled={isGenerating}
                  maxLength={MAX_CHARS}
                  aria-invalid={validationError ? "true" : "false"}
                  aria-describedby={validationError ? "situation-error" : "situation-help"}
                />

                <div className="flex justify-between items-center mb-4">
                  <p id="situation-help" className="text-sm text-gray-500 dark:text-gray-400">
                    {t.exampleText}
                  </p>
                  {charCount > 0 && (
                    <p
                      className={`text-xs font-medium ${
                        charCount > MAX_CHARS
                          ? "text-red-600 dark:text-red-400"
                          : charCount > 1800
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-500 dark:text-gray-400"
                      }`}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                    </p>
                  )}
                </div>

                {validationError && validationError !== t.errors.noToneSelected && (
                  <div
                    id="situation-error"
                    className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-3 mb-4 animate-in fade-in duration-200"
                    role="alert"
                    aria-live="assertive"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">{validationError}</p>
                        {validationError === t.errors.descriptionEmpty && (
                          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                            Please describe the situation you need help with before generating a draft.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {showZaraHelp && validationError && (
                  <ZaraHelp
                    message={
                      validationError === t.errors.descriptionTooShort || validationError === t.errors.descriptionEmpty
                        ? t.zaraHelp.shortDescription
                        : validationError === t.errors.noToneSelected
                          ? t.zaraHelp.noTone
                          : t.zaraHelp.apiFailure
                    }
                    className="mb-4"
                  />
                )}

                {showZaraHelp && validationError && retryCount > 0 && (
                  <div className="mb-4">
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-900/20 bg-transparent"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                      Retry Generation
                    </Button>
                  </div>
                )}

                {languageDetected && (
                  <LanguageDetectionBanner detection={languageDetected} onDismiss={dismissLanguageDetection} />
                )}

                {situationDetected && (
                  <SituationDetectionBanner
                    situation={situationDetected}
                    onUseTemplate={handleUseTemplate}
                    onDismiss={dismissSituation}
                  />
                )}

                {showSuggestions && (
                  <TemplateSuggestionsPanel
                    suggestions={suggestions}
                    onUseTemplate={handleUseTemplate}
                    onDismiss={dismissSuggestions}
                  />
                )}

                {!situation.trim() && !generatedDraft && (
                  <div
                    className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-start gap-3 relative"
                    role="status"
                  >
                    <Info
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                      {t.loadingStates?.firstTimeHint ||
                        "Create your first draft to start tracking your teaching impact!"}
                    </p>
                  </div>
                )}

                {isGenerating && (
                  <div
                    className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-xl p-4 mb-6 animate-in fade-in duration-200"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles
                        className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin"
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                          {t.loadingStates?.analyzing || "Analyzing your situation..."}
                        </p>
                        <div
                          className="h-1.5 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={50}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className="h-full bg-purple-600 dark:bg-purple-400 rounded-full animate-progress" />
                        </div>
                      </div>
                    </div>
                    <span className="sr-only">Generating your draft, please wait</span>
                  </div>
                )}

                {showSuccess && (
                  <div
                    className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg p-4 mb-4 animate-in fade-in scale-in duration-300"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex gap-2">
                        <Sparkles
                          className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse"
                          aria-hidden="true"
                        />
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">
                          ✨ Your draft is ready!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Review and customize below, or copy directly to use
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {generatedDraft && (
                  <div
                    className="bg-white dark:bg-gray-900 border-2 border-green-500 rounded-xl p-6 mb-6 shadow-lg shadow-green-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    role="region"
                    aria-labelledby="generated-draft-heading"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3
                          id="generated-draft-heading"
                          className="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                          Generated Draft
                        </h3>

                        {draftVersions.length > 1 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <button
                              onClick={handlePreviousVersion}
                              disabled={currentVersionIndex === 0}
                              className="p-1 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Previous version"
                            >
                              ←
                            </button>
                            <span>
                              Version {currentVersionIndex + 1} of {draftVersions.length}
                            </span>
                            <button
                              onClick={handleNextVersion}
                              disabled={currentVersionIndex === draftVersions.length - 1}
                              className="p-1 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Next version"
                            >
                              →
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <ExportDraftMenu
                          draftContent={generatedDraft}
                          onExport={(format) => {
                            setSuccessToast({
                              message: `Draft exported as ${format}!`,
                              type: "success",
                              icon: "check",
                            })
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyDraft}
                          className={`focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-all duration-300 ${copyButtonState === "copied" ? "bg-green-600 text-white border-green-600 scale-105" : ""}`}
                          aria-label={
                            copyButtonState === "copied" ? "Draft copied to clipboard" : "Copy draft to clipboard"
                          }
                        >
                          {copyButtonState === "copied" ? (
                            <>
                              <CheckCircle
                                className="w-4 h-4 mr-2 animate-in zoom-in duration-200"
                                aria-hidden="true"
                              />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerate}
                          disabled={isGenerating}
                          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 bg-transparent"
                          aria-label="Regenerate draft with same parameters"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                          Regenerate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 bg-transparent"
                          aria-label="Edit draft"
                        >
                          <Edit3 className="w-4 h-4 mr-2" aria-hidden="true" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    <Textarea
                      value={generatedDraft}
                      onChange={handleDraftEdit}
                      className="min-h-[300px] text-base font-sans whitespace-pre-wrap border-gray-200 dark:border-gray-700"
                      style={{ fontSize: "16px" }}
                    />

                    {isDraftEdited && (
                      <div className="mt-4 flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <p className="text-sm text-orange-900 dark:text-orange-100">
                          You've made changes to the original draft
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRevertModalOpen(true)}
                          className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Revert to Original
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {showZaraCongrats && draftsCreated === 1 && (
                  <div
                    className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-lg p-4 mb-6 animate-in fade-in duration-300"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles
                        className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                          Great job! Your first draft is complete. 🎉 You can edit it directly, copy it to use, or
                          regenerate with a different tone. Most teachers use drafts with minimal edits - you're already
                          saving time!
                        </p>
                      </div>
                      <button
                        onClick={() => setShowZaraCongrats(false)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                        aria-label="Dismiss message"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <fieldset>
                    <legend className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t.toneLabel}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2" aria-hidden="true">
                        (Use Tab to navigate)
                      </span>
                      {canUndoTone && (
                        <button
                          onClick={undoTone}
                          className="ml-3 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          aria-label="Undo tone change"
                        >
                          Undo tone change
                        </button>
                      )}
                    </legend>
                    <div
                      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
                      role="radiogroup"
                      aria-label="Select communication tone"
                    >
                      {tones.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => handleToneSelect(tone.id)}
                          disabled={isGenerating}
                          role="radio"
                          aria-checked={selectedTone === tone.id}
                          className={`px-4 sm:px-5 py-3 rounded-lg text-base font-medium transition-all duration-150 whitespace-nowrap min-h-[44px] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
                            selectedTone === tone.id
                              ? "bg-purple-600 text-white scale-105"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-98"
                          } ${validationError === t.errors.noToneSelected ? "animate-pulse" : ""}`}
                        >
                          {tone.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {validationError === t.errors.noToneSelected && (
                    <div
                      id="situation-error"
                      className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-3 mt-3 animate-in fade-in duration-200"
                      role="alert"
                      aria-live="assertive"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">{validationError}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleGenerateDraft}
                  disabled={!situation.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:scale-[1.02] active:scale-[0.98] text-white font-semibold py-6 sm:py-7 text-base sm:text-lg min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-all duration-200"
                  aria-label={isGenerating ? "Generating draft, please wait" : "Generate draft (Cmd+Enter)"}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-spin" aria-hidden="true" />
                      {t.loadingStates?.generating || "Generating..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-2" aria-hidden="true" />
                      {t.generateDraft}
                      <span className="ml-2 text-xs opacity-70 bg-white/10 px-2 py-0.5 rounded" aria-hidden="true">
                        ⌘↵
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </section>
        </main>

        {errorToast && (
          <ErrorToast message={errorToast.message} type={errorToast.type} onClose={() => setErrorToast(null)} />
        )}

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <MobileNav />

      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />

      <RevertDraftModal
        isOpen={isRevertModalOpen}
        onClose={() => setIsRevertModalOpen(false)}
        onConfirm={handleRevertToOriginal}
      />

      <style jsx global>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 200ms ease-in-out;
        }

        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .scale-in {
          animation: scale-in 300ms ease-out;
        }

        /* Hide scrollbar for horizontal scroll */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Safe area for iPhone notch */
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Added reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Added scale animation for active state */
        .active\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}
