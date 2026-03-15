import { CLOSING_REGEX, extractTrailingClosingBlock, formatDraftText } from "@/lib/draft/format"
import { sanitizeReportCommentStructure } from "@/lib/draft/report-comment"
import type { DraftMode } from "@/lib/types"

export interface ExportLayout {
  subject?: string
  paragraphs: string[]
  closingLines: string[]
  locale: string
}

interface ResolveExportLayoutOptions {
  draftText: string
  language?: string
  mode?: DraftMode | string
}

function resolveLocale(language?: string) {
  return language?.toLowerCase().startsWith("de") ? "de-DE" : "en-GB"
}

function looksLikeSignatureLine(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 80) {
    return false
  }
  if (/[.!?]{2,}/.test(trimmed)) {
    return false
  }
  return /[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]/u.test(trimmed)
}

function extractSignatureFromParagraphs(paragraphs: string[]) {
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

export function getExportSubjectLabel(locale: string) {
  return locale.toLowerCase().startsWith("de") ? "Betreff" : "Subject"
}

export function resolveExportLayout({
  draftText,
  language,
  mode,
}: ResolveExportLayoutOptions): ExportLayout {
  const locale = resolveLocale(language)
  const parsedDraft = formatDraftText(draftText, locale)
  const isReportComment = mode === "report_comment"
  const baseStructure = isReportComment
    ? sanitizeReportCommentStructure(parsedDraft, locale)
    : parsedDraft

  const extractedBase = extractSignatureFromParagraphs(baseStructure.paragraphs ?? [])
  let paragraphs = extractedBase.paragraphs
  let signature = extractedBase.signature

  if (!signature && !isReportComment) {
    signature =
      extractSignatureFromParagraphs(parsedDraft.paragraphs ?? []).signature ??
      extractTrailingClosingBlock(draftText).closingBlock ??
      undefined
  }

  return {
    subject: isReportComment ? undefined : baseStructure.subject,
    paragraphs,
    closingLines: signature
      ? signature
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
    locale,
  }
}
