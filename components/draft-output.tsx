"use client"

import { Copy, Check, Save, FileText, Edit3, RefreshCw, AlertCircle, ChevronDown, Repeat } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { SaveDraftModal } from "./save-draft-modal"
import type { DraftMode } from "@/lib/types"
import { MODE_DISPLAY_NAMES, DEFAULT_DRAFT_MODE } from "@/lib/draft-mode"

interface DraftOutputProps {
  draftText: string
  tone: string
  metadata: {
    generationTime: number
    wordCount: number
    modeUsed?: DraftMode
  }
  onSave: (tags: string[]) => void
  onEdit: () => void
  onRegenerate: () => void
  onRewrite: () => void
  draftsUsed: number
  draftsLimit: number
  showUsageLimit?: boolean
}

export function DraftOutput({
  draftText,
  tone,
  metadata,
  onSave,
  onEdit,
  onRegenerate,
  onRewrite,
  draftsUsed,
  draftsLimit,
  showUsageLimit = false,
}: DraftOutputProps) {
  const [copied, setCopied] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const modeLabel = MODE_DISPLAY_NAMES[metadata.modeUsed ?? DEFAULT_DRAFT_MODE]
  // Copy to clipboard with rich text support
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("[v0] Copy failed:", err)
    }
  }

  // Export as PDF (client-side generation for now)
  const handleExportPDF = async () => {
    // For now, create a simple download
    // TODO: Implement proper PDF generation with backend API
    const blob = new Blob([draftText], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zaza-draft-${Date.now()}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export as DOCX (client-side generation for now)
  const handleExportDOCX = async () => {
    // For now, create a simple download
    // TODO: Implement proper DOCX generation with backend API
    const blob = new Blob([draftText], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zaza-draft-${Date.now()}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const runMenuAction = (action: () => void, successMessage: string) => {
    if (!hasDraft) {
      setActionMessage("Generate a draft before using that menu.")
      return
    }
    action()
    setActionMessage(successMessage)
    closeMoreMenu()
  }

  const closeMoreMenu = () => {
    setShowMoreMenu(false)
  }
  const desktopMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const hasDraft = Boolean(draftText && draftText.trim())
  useEffect(() => {
    if (!showMoreMenu) {
      return undefined
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        desktopMenuRef.current?.contains(target) ||
        mobileMenuRef.current?.contains(target)
      ) {
        return
      }
      closeMoreMenu()
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMoreMenu])

  useEffect(() => {
    if (!actionMessage) {
      return undefined
    }

    const timer = setTimeout(() => setActionMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [actionMessage])

  const toneLabels: Record<string, string> = {
    warm: "Warm & Encouraging",
    professional: "Professional & Neutral",
    direct: "Direct & Clear",
    empathetic: "Empathetic & Supportive",
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Draft Generated</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metadata.wordCount} words • {toneLabels[tone] || tone}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mode: {modeLabel}</p>
            </div>
          </div>
        </div>

        {actionMessage && (
          <p className="mt-2 text-xs text-white/70 dark:text-white/60">{actionMessage}</p>
        )}

        {/* Generated Text */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{draftText}</p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>Generated in {(metadata.generationTime / 1000).toFixed(1)}s</span>
          <span>•</span>
          <span>{metadata.wordCount} words</span>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy to Clipboard
              </>
            )}
          </button>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            <Edit3 size={18} />
            Edit
          </button>

          <div className="relative" ref={desktopMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              aria-expanded={showMoreMenu}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
            >
              <ChevronDown size={16} />
              More actions
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => runMenuAction(() => setShowSaveModal(true), "Save modal opened.")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-t-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Save to Library
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(handleExportPDF, "PDF download ready.")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(handleExportDOCX, "DOCX download ready.")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as DOCX
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(onRegenerate, "Regenerating draft...")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(onRewrite, "Rewriting draft...")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-b-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Repeat size={18} />
                  Rewrite in tone
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy
              </>
            )}
          </button>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
          >
            <Edit3 size={18} />
            Edit
          </button>
          <div className="relative flex-1" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              aria-expanded={showMoreMenu}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
            >
              <ChevronDown size={16} />
              More
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => runMenuAction(() => setShowSaveModal(true), "Save modal opened.")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-t-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Save to Library
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(handleExportPDF, "PDF download ready.")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(handleExportDOCX, "DOCX download ready.")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as DOCX
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(onRegenerate, "Regenerating draft...")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(onRewrite, "Rewriting draft...")}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-b-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Repeat size={18} />
                  Rewrite in tone
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Usage Reminder (Freemium) */}
        {showUsageLimit && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {draftsUsed} of {draftsLimit} drafts used this month
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">Upgrade to Pro for unlimited drafts</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Modal */}
      <SaveDraftModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={(tags) => {
          onSave(tags)
          setShowSaveModal(false)
        }}
      />
    </>
  )
}
