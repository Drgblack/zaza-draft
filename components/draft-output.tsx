"use client"

import { Copy, Check, Save, FileText, Edit3, RefreshCw, AlertCircle, ChevronDown, Repeat } from "lucide-react"
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react"
import { SaveDraftModal } from "./save-draft-modal"
import { Badge } from "@/components/ui/badge"
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
import type { SafeToSendAssessment } from "@/lib/safe-to-send"
import { logClientEvent, TRUST_FUNNEL_EVENTS } from "@/lib/analytics"
import { emitClientSignal } from "@/lib/analytics/client-signal-emitter"
import type { TeacherDraftFeedback } from "@/lib/draft/teacher-draft-feedback"
import type { TeacherDraftSuggestion } from "@/lib/draft/teacher-draft-advisory"
import {
  DraftJudgementStrip,
  type DraftJudgementActionEvent,
  type DraftProfessionalJudgementMeta,
} from "@/components/draft-judgement-strip"

export function classifyEditDistance(
  original: string,
  edited: string,
): "none" | "minor" | "major" {
  if (original === edited) {
    return "none"
  }

  const originalWords = original.trim().split(/\s+/).filter(Boolean)
  const editedWords = edited.trim().split(/\s+/).filter(Boolean)
  const lowerOriginalWords = originalWords.map((word) => word.toLowerCase())
  const lowerEditedWords = editedWords.map((word) => word.toLowerCase())
  let originalIndex = 0

  for (const word of lowerEditedWords) {
    if (word === lowerOriginalWords[originalIndex]) {
      originalIndex += 1
    }
  }

  if (
    originalIndex === lowerOriginalWords.length &&
    Math.abs(originalWords.length - editedWords.length) <= 3
  ) {
    return "minor"
  }

  const changedWords = Math.abs(originalWords.length - editedWords.length)
  const originalWordCount = originalWords.length
  const changeRatio = originalWordCount > 0 ? changedWords / originalWordCount : 1

  return changeRatio < 0.2 ? "minor" : "major"
}

interface DraftClientAnalyticsContext {
  sessionId: string
  uidHash: string
  locale: string
}

interface DraftOutputProps {
  draftText: string
  tone: string
  modeLabelOverride?: string
  metadata: {
    generationTime: number
    wordCount: number
    modeUsed?: DraftMode
    signatureBlock?: string
    forwardSafeRewrite?: boolean
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
  headerBadge?: ReactNode
  headerBanner?: ReactNode
  resultModeBadge?: string | null
  documentationMode?: boolean
  draftAttribution?: string | null
  rewriteSummary?: string | null
  safeToSend?: SafeToSendAssessment | null
  teacherDraftFeedback?: TeacherDraftFeedback | null
  suggestions?: TeacherDraftSuggestion[]
  debugAdvisoryStateCount?: number
  debugAdvisoryResponse?: {
    inputIntent?: string | null
    advisorySourceLength?: number
    generatedDraftLength?: number
    suggestionsLength?: number
    advisorySourcePreview?: string | null
    generatedDraftPreview?: string | null
    firstSuggestionType?: string | null
    firstSuggestionOriginal?: string | null
    helper?: {
      languageReceived?: string
      normalizedLanguage?: string
      languageGatePassed?: boolean
      sentenceCount?: number
      firstParsedSentences?: string[]
      candidateCountBeforeVisibleFiltering?: number
      candidateCountAfterVisibleFiltering?: number
      filteredReasonCounts?: {
        language_not_supported?: number
        no_sentence_match?: number
        filtered_already_resolved?: number
        missing_visible_original?: number
        unknown?: number
      }
    } | null
  } | null
  onApplySuggestion?: (suggestionId: string) => void
  onDismissSuggestion?: (suggestionId: string) => void
  teacherDraftMode?: boolean
  professionalJudgement?: DraftProfessionalJudgementMeta | null
  professionalJudgementLoading?: boolean
  analyticsContext?: DraftClientAnalyticsContext | null
  onBeginEditSession?: (displayedAt: number) => void
}

function renderHighlightedParagraph(
  paragraph: string,
  suggestions: TeacherDraftSuggestion[],
) {
  if (!suggestions.length) {
    return paragraph
  }

  const fragments: ReactNode[] = []
  let cursor = 0

  while (cursor < paragraph.length) {
    let nextMatch: { start: number; end: number; suggestion: TeacherDraftSuggestion } | null = null

    for (const suggestion of suggestions) {
      const start = paragraph.indexOf(suggestion.original, cursor)
      if (start < 0) {
        continue
      }

      const candidate = {
        start,
        end: start + suggestion.original.length,
        suggestion,
      }
      if (!nextMatch || candidate.start < nextMatch.start) {
        nextMatch = candidate
      }
    }

    if (!nextMatch) {
      fragments.push(paragraph.slice(cursor))
      break
    }

    if (nextMatch.start > cursor) {
      fragments.push(paragraph.slice(cursor, nextMatch.start))
    }

    fragments.push(
      <mark
        key={`${nextMatch.suggestion.id}-${nextMatch.start}`}
        className="rounded bg-amber-200/80 px-0.5 text-gray-900 dark:bg-amber-500/30 dark:text-gray-100"
      >
        {paragraph.slice(nextMatch.start, nextMatch.end)}
      </mark>,
    )
    cursor = nextMatch.end
  }

  return fragments
}

export function DraftOutput({
  draftText,
  tone,
  modeLabelOverride,
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
  headerBadge,
  headerBanner,
  resultModeBadge,
  documentationMode = false,
  draftAttribution = null,
  rewriteSummary = null,
  safeToSend,
  teacherDraftFeedback = null,
  suggestions = [],
  debugAdvisoryStateCount,
  debugAdvisoryResponse = null,
  onApplySuggestion,
  onDismissSuggestion,
  teacherDraftMode = false,
  professionalJudgement = null,
  professionalJudgementLoading = false,
  analyticsContext = null,
  onBeginEditSession,
}: DraftOutputProps) {
  const [copied, setCopied] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const { locale, t } = useLocale()
  const searchParams = useSearchParams()
  const showDiagnostics = isDebugEnabled(searchParams)
  const showAdvisoryDebug = searchParams.get("debugAdvisory") === "1"
  const displayedAtRef = useRef(Date.now())
  const terminalActionRecordedRef = useRef(false)
  const sendConfidenceOutcomeEmittedRef = useRef(false)
  const [lastJudgementAction, setLastJudgementAction] = useState<DraftJudgementActionEvent | null>(null)
  const modeKey = (metadata.modeUsed ?? DEFAULT_DRAFT_MODE) as keyof typeof MODE_LABEL_KEYS
  const modeLabel = modeLabelOverride ?? t(MODE_LABEL_KEYS[modeKey])
  const teacherDraftFeedbackVerdict = teacherDraftFeedback?.verdict ?? teacherDraftFeedback?.level
  const teacherDraftFeedbackLines = useMemo(() => {
    if (!teacherDraftFeedback) {
      return []
    }

    return teacherDraftFeedback.reasons.map((reason) => {
      if (reason === "preserved_tone") {
        return t(`draft.teacherDraftFeedback.${teacherDraftFeedbackVerdict}.preservedTone`)
      }
      if (reason === "maintained_boundaries") {
        return t("draft.teacherDraftFeedback.maintainedBoundaries")
      }
      return t(`draft.teacherDraftFeedback.${teacherDraftFeedbackVerdict}.riskChecked`)
    })
  }, [t, teacherDraftFeedback, teacherDraftFeedbackVerdict])
  const shouldShowJudgementStrip =
    teacherDraftMode &&
    metadata.modeUsed === "parent_message" &&
    teacherDraftFeedbackVerdict !== "already_strong" &&
    (professionalJudgementLoading || Boolean(professionalJudgement))

  const emitSendConfidenceOutcome = useCallback(async (teacherAction: "sent" | "discarded") => {
    if (
      !analyticsContext ||
      !professionalJudgement ||
      sendConfidenceOutcomeEmittedRef.current ||
      (teacherAction === "discarded" && professionalJudgement.sendConfidenceScore >= 60)
    ) {
      return
    }

    const scoreBand =
      professionalJudgement.sendConfidenceScore >= 80
        ? "high"
        : professionalJudgement.sendConfidenceScore >= 60
          ? "medium"
          : "low"

    const signalType =
      teacherAction === "sent"
        ? (`send_confidence_${scoreBand}_accepted` as const)
        : "send_confidence_low_discarded"

    sendConfidenceOutcomeEmittedRef.current = true
    await emitClientSignal({
      sessionId: analyticsContext.sessionId,
      uidHash: analyticsContext.uidHash,
      signalType,
      payload: {
        scoreAtSend: professionalJudgement.sendConfidenceScore,
        scoreBand,
        teacherAction,
        replyLikelihood: professionalJudgement.replyLikelihood,
        regretRisk: professionalJudgement.regretRisk,
      },
      locale: analyticsContext.locale,
    })
  }, [analyticsContext, professionalJudgement])

  const markJudgementAction = (type: DraftJudgementActionEvent["type"]) => {
    setLastJudgementAction({
      type,
      at: Date.now(),
    })
  }

  const emitAcceptedSignal = async () => {
    if (!analyticsContext || terminalActionRecordedRef.current) {
      return
    }

    terminalActionRecordedRef.current = true
    markJudgementAction("sent")
    await emitClientSignal({
      sessionId: analyticsContext.sessionId,
      uidHash: analyticsContext.uidHash,
      signalType: "draft_accepted",
      payload: {
        interactionType: "accepted",
        timeToActionMs: Date.now() - displayedAtRef.current,
        sendConfidenceScore: professionalJudgement?.sendConfidenceScore,
        verdictAtAction: teacherDraftFeedbackVerdict,
        editDistanceCategory: "none",
      },
      locale: analyticsContext.locale,
    })
    await emitSendConfidenceOutcome("sent")
  }

  const emitRegeneratedSignal = async () => {
    if (!analyticsContext || terminalActionRecordedRef.current) {
      return
    }

    terminalActionRecordedRef.current = true
    markJudgementAction("regenerated")
    await emitClientSignal({
      sessionId: analyticsContext.sessionId,
      uidHash: analyticsContext.uidHash,
      signalType: "draft_regenerated",
      payload: {
        interactionType: "regenerated",
        timeToActionMs: Date.now() - displayedAtRef.current,
        sendConfidenceScore: professionalJudgement?.sendConfidenceScore,
        verdictAtAction: teacherDraftFeedbackVerdict,
      },
      locale: analyticsContext.locale,
    })
  }
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
  }, [structure, draftText, modeKey])
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
    if (draftAttribution) {
      segments.push(draftAttribution)
    }
    if (!segments.length) {
      return ""
    }
    return segments.join("\n").trim()
  }, [displaySubject, displayParagraphs, draftAttribution, signatureParagraph])
  const suggestionsByParagraph = useMemo(
    () =>
      displayParagraphs.map((paragraph) =>
        suggestions.filter((suggestion) => paragraph.includes(suggestion.original)),
      ),
    [displayParagraphs, suggestions],
  )
  const showTeacherDraftSuggestions = suggestions.length > 0
  const firstSuggestion = suggestions[0] ?? null
  const firstSuggestionSnippet = firstSuggestion
    ? firstSuggestion.original.replace(/\s+/g, " ").trim().slice(0, 100)
    : null
  // Copy to clipboard with rich text support
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText)
      await emitAcceptedSignal()
      logClientEvent(TRUST_FUNNEL_EVENTS.draftCopied, {
        mode: metadata.modeUsed ?? DEFAULT_DRAFT_MODE,
      })
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
      const exportDraftText = draftText.trim()
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftText: exportDraftText,
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
      await emitAcceptedSignal()
      logClientEvent(TRUST_FUNNEL_EVENTS.draftExported, {
        format: "pdf",
        mode,
      })
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
          draftText: clipboardText,
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
      await emitAcceptedSignal()
      logClientEvent(TRUST_FUNNEL_EVENTS.draftExported, {
        format: "docx",
        mode,
      })
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
  const safeToSendStyles = useMemo(() => {
    switch (safeToSend?.status) {
      case "READY_TO_SEND":
        return {
          border: "border-emerald-200 dark:border-emerald-500/30",
          background: "bg-emerald-50 dark:bg-emerald-950/20",
          badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
          icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100",
        }
      case "REVIEW_ONCE_MORE":
        return {
          border: "border-slate-300 dark:border-slate-500/30",
          background: "bg-slate-100 dark:bg-slate-900/40",
          badge: "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-100",
          icon: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100",
        }
      default:
        return {
          border: "border-amber-200 dark:border-amber-500/30",
          background: "bg-amber-50 dark:bg-amber-950/20",
          badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
          icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
        }
    }
  }, [safeToSend?.status])
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

  useEffect(() => {
    displayedAtRef.current = Date.now()
    terminalActionRecordedRef.current = false
    sendConfidenceOutcomeEmittedRef.current = false
    setLastJudgementAction(null)
  }, [draftText])

  useEffect(() => {
    return () => {
      if (!analyticsContext || terminalActionRecordedRef.current || !hasDraft) {
        return
      }

      terminalActionRecordedRef.current = true
      void emitClientSignal({
        sessionId: analyticsContext.sessionId,
        uidHash: analyticsContext.uidHash,
        signalType: "draft_discarded",
        payload: {
          interactionType: "discarded",
          timeToActionMs: Date.now() - displayedAtRef.current,
          sendConfidenceScore: professionalJudgement?.sendConfidenceScore,
          verdictAtAction: teacherDraftFeedbackVerdict,
        },
        locale: analyticsContext.locale,
      })
      void emitSendConfidenceOutcome("discarded")
    }
  }, [analyticsContext, emitSendConfidenceOutcome, hasDraft, professionalJudgement?.sendConfidenceScore, teacherDraftFeedbackVerdict])

  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("draft.generatedTitle")}</h3>
                {headerBadge}
                {resultModeBadge ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide">
                    {resultModeBadge}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metadata.wordCount} words • {t(`tone.${tone}`)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("draft.modeLabel", { mode: modeLabel })}</p>
            </div>
          </div>
        </div>

        {headerBanner ? <div className="mb-4">{headerBanner}</div> : null}

        {actionMessage && (
          <p className="mt-2 text-xs text-white/70 dark:text-white/60">{actionMessage}</p>
        )}

        {documentationMode ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-500/30 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("draft.documentation.label")}
              </p>
              <Badge className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-800 dark:bg-slate-500/20 dark:text-slate-100">
                {t("draft.documentation.badge")}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
              {t("draft.documentation.description")}
            </p>
          </div>
        ) : null}

        {modeKey === "parent_message" || rewriteSummary || teacherDraftFeedback ? (
          <div className="mb-4 space-y-3">
            {modeKey === "parent_message" ? (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {t("draft.teacherControl.reassurance")}
                </p>
              </div>
            ) : null}

            {teacherDraftFeedback ? (
              <div className="rounded-xl border border-slate-200/85 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                {teacherDraftFeedbackVerdict === "already_strong" ? (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("draft.teacherDraftFeedback.alreadyStrong")}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("draft.teacherDraftFeedback.heading")}
                      </p>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {teacherDraftFeedbackLines.map((line, index) => (
                        <li
                          key={`${line}-${index}`}
                          className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                        >
                          <span aria-hidden="true" className="mt-0.5 text-slate-400 dark:text-slate-500">
                            •
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : rewriteSummary ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50/85 p-3 dark:border-sky-500/30 dark:bg-sky-950/20">
                <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-100">
                  {rewriteSummary}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {showTeacherDraftSuggestions ? (
          <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-100/85 px-4 py-3 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
              {`⚠ ${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} to reduce escalation risk`}
            </p>
          </div>
        ) : null}

        {showAdvisoryDebug ? (
          <div className="mb-4 rounded-xl border border-sky-300/70 bg-sky-50/95 px-4 py-3 text-xs text-sky-950 shadow-sm dark:border-sky-500/40 dark:bg-sky-950/30 dark:text-sky-100">
            <p className="font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
              Advisory debug
            </p>
            <div className="mt-2 space-y-1">
              <p>Build: {buildSha ?? "unknown"}</p>
              <p>Editor state suggestions: {debugAdvisoryStateCount ?? 0}</p>
              <p>DraftOutput suggestions: {suggestions.length}</p>
              <p>Render condition: {showTeacherDraftSuggestions ? "true" : "false"}</p>
              <p>First suggestion type: {firstSuggestion?.type ?? "none"}</p>
              <p>First suggestion snippet: {firstSuggestionSnippet ?? "none"}</p>
              <p>Server inputIntent: {debugAdvisoryResponse?.inputIntent ?? "none"}</p>
              <p>Server advisorySourceLength: {debugAdvisoryResponse?.advisorySourceLength ?? 0}</p>
              <p>Server generatedDraftLength: {debugAdvisoryResponse?.generatedDraftLength ?? 0}</p>
                <p>Server suggestionsLength: {debugAdvisoryResponse?.suggestionsLength ?? 0}</p>
                <p>Server firstSuggestionType: {debugAdvisoryResponse?.firstSuggestionType ?? "none"}</p>
                <p>
                  Server firstSuggestionOriginal:{" "}
                  {debugAdvisoryResponse?.firstSuggestionOriginal ?? "none"}
                </p>
                <p>Helper languageReceived: {debugAdvisoryResponse?.helper?.languageReceived ?? "none"}</p>
                <p>
                  Helper normalizedLanguage:{" "}
                  {debugAdvisoryResponse?.helper?.normalizedLanguage ?? "none"}
                </p>
                <p>
                  Helper languageGatePassed:{" "}
                  {debugAdvisoryResponse?.helper?.languageGatePassed == null
                    ? "none"
                    : debugAdvisoryResponse.helper.languageGatePassed
                      ? "true"
                      : "false"}
                </p>
                <p>Helper sentenceCount: {debugAdvisoryResponse?.helper?.sentenceCount ?? 0}</p>
                <p>
                  Helper candidateCountBeforeVisibleFiltering:{" "}
                  {debugAdvisoryResponse?.helper?.candidateCountBeforeVisibleFiltering ?? 0}
                </p>
                <p>
                  Helper candidateCountAfterVisibleFiltering:{" "}
                  {debugAdvisoryResponse?.helper?.candidateCountAfterVisibleFiltering ?? 0}
                </p>
                <p>
                  Helper filteredReasonCounts:{" "}
                  {JSON.stringify(debugAdvisoryResponse?.helper?.filteredReasonCounts ?? null)}
                </p>
                <p>
                  Helper firstParsedSentences:{" "}
                  {debugAdvisoryResponse?.helper?.firstParsedSentences?.join(" || ") ?? "none"}
                </p>
                <p>
                  Server advisorySourcePreview:{" "}
                  {debugAdvisoryResponse?.advisorySourcePreview ?? "none"}
                </p>
              <p>
                Server generatedDraftPreview:{" "}
                {debugAdvisoryResponse?.generatedDraftPreview ?? "none"}
              </p>
            </div>
          </div>
        ) : null}

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
            <div key={`paragraph-${index}-${paragraph.slice(0, 16)}`} className="space-y-3">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-normal">
                {renderHighlightedParagraph(paragraph, suggestionsByParagraph[index] ?? [])}
              </p>
            </div>
          ))}
          {signatureParagraph && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap border-t border-gray-200 dark:border-gray-600 pt-3">
              {signatureParagraph}
            </p>
          )}
          {draftAttribution && (
            <p className="text-xs text-gray-400 dark:text-gray-400 whitespace-pre-wrap">
              {draftAttribution}
            </p>
          )}
        </div>

        {showTeacherDraftSuggestions ? (
          <div className="mb-4 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/20">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {`Suggestions before you send (${suggestions.length})`}
              </h4>
              <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                {`${suggestions.length} flagged`}
              </span>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-xl border border-amber-200 bg-white/85 p-4 shadow-sm dark:border-amber-500/30 dark:bg-slate-900/50"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200">
                    {suggestion.type.replace("_", " ")}
                  </p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Original sentence
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                        {suggestion.original}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 dark:border-emerald-500/30 dark:bg-emerald-950/30">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-200">
                        Suggested rewrite
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-900 dark:text-slate-50">
                        {suggestion.suggestion}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onApplySuggestion?.(suggestion.id)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismissSuggestion?.(suggestion.id)}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-500/10"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {shouldShowJudgementStrip ? (
          <div className="mb-4">
            <DraftJudgementStrip
              professionalJudgement={professionalJudgement}
              teacherDraftMode={teacherDraftMode}
              modeUsed={metadata.modeUsed}
              verdict={teacherDraftFeedbackVerdict}
              loading={professionalJudgementLoading}
              analyticsContext={analyticsContext}
              lastAction={lastJudgementAction}
            />
          </div>
        ) : null}

        {metadata.forwardSafeRewrite ? (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-950/20">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("draft.forwardSafe.label")}
              </p>
              <Badge className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-sky-800 dark:bg-sky-500/20 dark:text-sky-100">
                {t("draft.forwardSafe.badge")}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
              {t("draft.forwardSafe.description")}
            </p>
          </div>
        ) : null}

        {safeToSend ? (
          <div
            className={`mb-4 rounded-2xl border p-4 sm:p-5 ${safeToSendStyles.border} ${safeToSendStyles.background}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${safeToSendStyles.icon}`}
              >
                {safeToSend.status === "READY_TO_SEND" ? (
                  <Check size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-300">
                    {t("draft.safeToSend.label")}
                  </p>
                  <Badge className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${safeToSendStyles.badge}`}>
                    {t(safeToSend.titleKey)}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                  {t(safeToSend.descriptionKey)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

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
            onClick={() => {
              terminalActionRecordedRef.current = true
              markJudgementAction("edited")
              onBeginEditSession?.(displayedAtRef.current)
              onEdit()
            }}
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
                  void runMenuAction(async () => {
                    await emitRegeneratedSignal()
                    onRegenerate()
                  }, "Regenerating draft...")
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
            onClick={() => {
              terminalActionRecordedRef.current = true
              markJudgementAction("edited")
              onBeginEditSession?.(displayedAtRef.current)
              onEdit()
            }}
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
                    void runMenuAction(async () => {
                      await emitRegeneratedSignal()
                      onRegenerate()
                    }, "Regenerating draft...")
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
