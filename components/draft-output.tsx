"use client"

import { Copy, Check, Save, FileText, Download, Edit3, RefreshCw, AlertCircle, ChevronDown } from "lucide-react"
import { useState } from "react"
import { SaveDraftModal } from "./save-draft-modal"

interface DraftOutputProps {
  draftText: string
  tone: string
  metadata: {
    generationTime: number
    wordCount: number
  }
  onSave: (tags: string[]) => void
  onEdit: () => void
  onRegenerate: () => void
  draftsUsed: number
  draftsLimit: number
}

export function DraftOutput({
  draftText,
  tone,
  metadata,
  onSave,
  onEdit,
  onRegenerate,
  draftsUsed,
  draftsLimit,
}: DraftOutputProps) {
  const [copied, setCopied] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

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
    setShowExportMenu(false)
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
    setShowExportMenu(false)
  }

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
            </div>
          </div>
        </div>

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

        {/* Action Buttons - Desktop */}
        <div className="hidden md:flex flex-wrap gap-3">
          {/* Copy Button (Primary) */}
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

          {/* Save to Library */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            <Save size={18} />
            Save to Library
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
            >
              <Download size={18} />
              Export
              <ChevronDown size={16} className="ml-1" />
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-t-lg transition"
                >
                  <FileText size={18} />
                  Export as PDF
                </button>
                <button
                  onClick={handleExportDOCX}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-b-lg transition"
                >
                  <FileText size={18} />
                  Export as DOCX
                </button>
              </div>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            <Edit3 size={18} />
            Edit
          </button>

          {/* Regenerate Button */}
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            <RefreshCw size={18} />
            Regenerate
          </button>
        </div>

        {/* Action Buttons - Mobile (Stacked) */}
        <div className="flex md:hidden flex-col gap-3">
          {/* Copy Button (Full Width) */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition w-full"
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

          {/* 2x2 Grid for Other Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
            >
              <Save size={18} />
              Save
            </button>

            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
            >
              <Download size={18} />
              Export
            </button>

            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
            >
              <Edit3 size={18} />
              Edit
            </button>

            <button
              onClick={onRegenerate}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
            >
              <RefreshCw size={18} />
              Regenerate
            </button>
          </div>
        </div>

        {/* Usage Reminder (Freemium) */}
        <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {draftsUsed} of {draftsLimit} drafts used this month
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">Upgrade to Pro for unlimited drafts</p>
          </div>
        </div>
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
