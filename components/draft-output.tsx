"use client"

import { Copy, Check, Save, FileText, Edit3, RefreshCw, AlertCircle, ChevronDown, Repeat } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { SaveDraftModal } from "./save-draft-modal"
import type { DraftMode } from "@/lib/types"
import {
  DraftStructure,
  formatDraftText,
  CLOSING_REGEX,
  extractTrailingClosingBlock,
} from "@/lib/draft/format"
import { sanitizeReportCommentStructure } from "@/lib/draft/report-comment"
import { MODE_LABEL_KEYS, DEFAULT_DRAFT_MODE } from "@/lib/draft-mode"
import { useLocale } from "@/hooks/use-locale"
import { useSearchParams } from "next/navigation"
import { isDebugEnabled } from "@/lib/debug"

interface DraftOutputProps {
  draftText: string
  tone: string
  metadata: {
    generationTime: number
    wordCount: number
    modeUsed?: DraftMode
  }
  structure?: DraftStructure
  onSave: (tags: string[]) => void
  onEdit: () => void
  onRegenerate: () => void
  onRewrite: () => void
  draftsUsed: number
  draftsLimit: number
  showUsageLimit?: boolean
  buildSha?: string
  canExport?: boolean
  getIdToken?: () => Promise<string | null>
}

export function DraftOutput({
  draftText,
  tone,
  metadata,
  structure,
  onSave,
  onEdit,
  onRegenerate,
  onRewrite,
  draftsUsed,
  draftsLimit,
  showUsageLimit = false,
  buildSha,
  canExport = true,
  getIdToken,
}: DraftOutputProps) {
  const [copied, setCopied] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const { locale, t } = useLocale()
  const searchParams = useSearchParams()
  const showDiagnostics = isDebugEnabled(searchParams)
  const modeKey = (metadata.modeUsed ?? DEFAULT_DRAFT_MODE) as keyof typeof MODE_LABEL_KEYS
  const modeLabel = t(MODE_LABEL_KEYS[modeKey])
  const { displaySubject, displayParagraphs, signatureParagraph } = useMemo(() => {
    const parsedDraftText = formatDraftText(draftText, locale)
    const baseStructure = structure ?? parsedDraftText
    const resolvedStructure =
      modeKey === "report_comment"
        ? sanitizeReportCommentStructure(baseStructure, locale)
        : baseStructure
    const subject = modeKey === "parent_message" ? resolvedStructure.subject : undefined
    const looksLikeSignatureLine = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed || trimmed.length > 80) {
        return false
      }
      if (/[.!?]{2,}/.test(trimmed)) {
        return false
      }
      return /[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]/u.test(trimmed)
    }
    const extractSignatureFromParagraphs = (paragraphs: string[]) => {
      const working = [...paragraphs]
      let signature: string | undefined
      if (!working.length) {
        return { paragraphs: working, signature }
      }
      const lastParagraph = working[working.length - 1]
      const penultimateParagraph = working[working.length - 2]
      if (lastParagraph && CLOSING_REGEX.test(lastParagraph)) {
        signature = working.pop()
      } else if (
        penultimateParagraph &&
        lastParagraph &&
        CLOSING_REGEX.test(penultimateParagraph) &&
        looksLikeSignatureLine(lastParagraph)
      ) {
        const nameLine = working.pop()
        const closingLine = working.pop()
        signature = `${closingLine}\n${nameLine}`
      }
      return { paragraphs: working, signature }
    }

    const extractedBase = extractSignatureFromParagraphs(resolvedStructure.paragraphs ?? [])
    let paragraphs = extractedBase.paragraphs
    let signature = extractedBase.signature

    if (!signature && modeKey === "parent_message") {
      signature = extractSignatureFromParagraphs(parsedDraftText.paragraphs ?? []).signature
    }

    if (!signature && modeKey === "parent_message") {
      signature = extractTrailingClosingBlock(draftText).closingBlock ?? undefined
    }

    return {
      displaySubject: subject,
      displayParagraphs: paragraphs,
      signatureParagraph: signature,
    }
  }, [structure, draftText, modeKey, locale])
  const clipboardText = useMemo(() => {
    const segments: string[] = []
    if (displaySubject) {
      segments.push(`Subject: ${displaySubject}`, "")
    }
    if (displayParagraphs.length) {
      segments.push(displayParagraphs.join("\n\n"))
    }
    if (signatureParagraph) {
      segments.push(signatureParagraph)
    }
    if (!segments.length) {
      return ""
    }
    return segments.join("\n").trim()
  }, [displaySubject, displayParagraphs, signatureParagraph])
  // Copy to clipboard with rich text support
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("[v0] Copy failed:", err)
    }
  }

  const extractFilenameFromDisposition = (contentDisposition: string | null) => {
    if (!contentDisposition) return null
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (filenameStarMatch) {
      return decodeURIComponent(filenameStarMatch[1])
    }
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i)
    if (filenameMatch) {
      return filenameMatch[1]
    }
    return null
  }

  const createDownloadLink = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    if (!canExport) {
      setActionMessage("Access required before exporting.")
      return
    }

    const token = await getIdToken?.()
    if (!token) {
      setActionMessage("Please sign in again before exporting.")
      return
    }

    setActionMessage("Preparing PDF…")
    try {
      const mode = metadata.modeUsed ?? DEFAULT_DRAFT_MODE
      const language = locale.startsWith("de") ? "de" : "en"
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftText,
          mode,
          tone,
          language,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setActionMessage(payload?.message ?? "Unable to prepare the PDF right now.")
        return
      }

      const blob = await response.blob()
      const filename =
        extractFilenameFromDisposition(response.headers.get("content-disposition")) ??
        `zaza-draft-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`
      createDownloadLink(blob, filename)
      setActionMessage("PDF download started.")
    } catch (error) {
      console.error("[draft output] PDF export failed", error)
      setActionMessage("Unable to prepare the PDF. Please try again.")
    }
  }

  // Export as DOCX (client-side generation for now)
  const handleExportDOCX = async () => {
    if (!canExport) {
      setActionMessage("Access required before exporting.")
      return
    }

    const token = await getIdToken?.()
    if (!token) {
      setActionMessage("Please sign in again before exporting.")
      return
    }

    setActionMessage("Preparing DOCX.")
    try {
      const mode = metadata.modeUsed ?? DEFAULT_DRAFT_MODE
      const language = locale.startsWith("de") ? "de" : "en"
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftText,
          mode,
          tone,
          language,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setActionMessage(payload?.message ?? "Unable to prepare the DOCX right now.")
        return
      }

      const blob = await response.blob()
      const filename =
        extractFilenameFromDisposition(response.headers.get("content-disposition")) ??
        `zaza-draft-${new Date().toISOString().replace(/[:.]/g, "-")}.docx`
      createDownloadLink(blob, filename)
      setActionMessage("DOCX download started.")
    } catch (error) {
      console.error("[draft output] DOCX export failed", error)
      setActionMessage("Unable to prepare the DOCX. Please try again.")
    }
  }

  const runMenuAction = async (action: () => Promise<void> | void, successMessage?: string) => {
    if (!hasDraft) {
      setActionMessage("Generate a draft before using that menu.")
      return
    }
    try {
      await action()
      if (successMessage) {
        setActionMessage(successMessage)
      }
    } catch (error) {
      console.error("[draft output] menu action failed", error)
      setActionMessage("Something went wrong. Please try again.")
    }
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
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("draft.generatedTitle")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
              {metadata.wordCount} words • {t(`tone.${tone}`)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("draft.modeLabel", { mode: modeLabel })}</p>
            </div>
          </div>
        </div>

        {actionMessage && (
          <p className="mt-2 text-xs text-white/70 dark:text-white/60">{actionMessage}</p>
        )}

        {/* Generated Text */}
        <div
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-4 sm:space-y-5 font-normal"
          data-testid="draft-output-body"
        >
          {displaySubject && (
            <p className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-3 mb-0">
              {t("editor.history.subjectLabel")}: {displaySubject}
            </p>
          )}
          {displayParagraphs.map((paragraph, index) => (
            <p
              key={`paragraph-${index}-${paragraph.slice(0, 16)}`}
              className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-normal"
            >
              {paragraph}
            </p>
          ))}
          {signatureParagraph && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap border-t border-gray-200 dark:border-gray-600 pt-3">
              {signatureParagraph}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>{t("draft.generatedDetails", { seconds: (metadata.generationTime / 1000).toFixed(1) })}</span>
          <span>•</span>
          <span>{t("statusBar.words", { count: metadata.wordCount })}</span>
        </div>

        {showDiagnostics && (
          <details
            className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white/90 p-3 text-xs text-slate-700"
            open
          >
            <summary className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Formatter diagnostics
            </summary>
            <div className="mt-2 space-y-1 pl-2">
              <p>Build: {buildSha ?? "unknown"}</p>
              <p>Locale: {locale}</p>
              <p>Subject detected: {displaySubject ? "yes" : "no"}</p>
              <p>Paragraph count: {displayParagraphs.length}</p>
              <p>Raw length: {draftText.length}</p>
              <p>Preview: {draftText.trim().slice(0, 120).replace(/\n/g, "\\n")}</p>
            </div>
          </details>
        )}

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
                {t("draft.button.copy")}
              </>
            )}
          </button>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            <Edit3 size={18} />
                {t("draft.button.edit")}
          </button>

          <div className="relative" ref={desktopMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                aria-expanded={showMoreMenu}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
              >
                <ChevronDown size={16} />
                {t("draft.button.moreActions")}
              </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
          <button
            type="button"
            onClick={() => {
              void runMenuAction(() => setShowSaveModal(true), "Save modal opened.")
            }}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-t-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Save to Library
                </button>
                <button
                  type="button"
                onClick={() => {
                  void runMenuAction(handleExportPDF)
                }}
                  disabled={!hasDraft || !canExport}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as PDF
                </button>
                <button
                  type="button"
                onClick={() => {
                  void runMenuAction(handleExportDOCX, "DOCX download ready.")
                }}
                  disabled={!hasDraft || !canExport}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as DOCX
                </button>
                <button
                  type="button"
                onClick={() => {
                  void runMenuAction(onRegenerate, "Regenerating draft...")
                }}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} />
                  Regenerate
                </button>
                <button
                  type="button"
                onClick={() => {
                  void runMenuAction(onRewrite, "Rewriting draft...")
                }}
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
                {t("draft.button.copyShort")}
              </>
            )}
          </button>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
          >
            <Edit3 size={18} />
        {t("draft.button.edit")}
          </button>
          <div className="relative flex-1" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              aria-expanded={showMoreMenu}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition"
            >
              <ChevronDown size={16} />
              {t("draft.button.more")}
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => {
                    void runMenuAction(() => setShowSaveModal(true), "Save modal opened.")
                  }}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 rounded-t-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Save to Library
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void runMenuAction(handleExportPDF)
                  }}
                  disabled={!hasDraft || !canExport}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void runMenuAction(handleExportDOCX, "DOCX download ready.")
                  }}
                  disabled={!hasDraft || !canExport}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={18} />
                  Export as DOCX
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void runMenuAction(onRegenerate, "Regenerating draft...")
                  }}
                  disabled={!hasDraft}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void runMenuAction(onRewrite, "Rewriting draft...")
                  }}
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
