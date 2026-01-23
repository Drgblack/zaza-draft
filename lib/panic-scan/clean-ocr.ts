export type CleanOcrResult = {
  cleanText: string
  confidence: number
  removedLines: number
  debug?: {
    keptLines: string[]
    removedLines: string[]
    reasonCounts: Record<string, number>
    boundaries?: { start: number; end: number }
  }
}

type LineEntry = {
  text: string
  index: number
  blankBefore: number
}

type DetectionResult =
  | { index: number; type: "greeting" | "content" | "raw" }
  | { index: number; type: "signature" | "content" | "raw"; signatureIndex?: number }

// Gmail/Google UI fragments and generic chrome we know we can drop safely.
// Expand this list whenever new navigation/label text appears in OCR output.
const UI_CHROME_KEYWORDS = [
  "inbox",
  "starred",
  "snoozed",
  "sent",
  "drafts",
  "more",
  "labels",
  "chat",
  "mail",
  "compose",
  "search mail",
  "view options",
  "filter",
  "create bucket",
  "share in chat",
  "summarise this email",
  "reply",
  "forward",
  "open in",
  "upgrade",
  "facebook growth",
  "reddit growth",
  "twitter growth",
  "catch-all",
  "summarise this email",
  "translate to english",
  "it looks like this message is in german",
  "open in gmail",
  "gmail",
  "meet",
  "compose",
  "inbox",
  "starred",
  "snoozed",
  "sent",
  "drafts",
]

const GREETING_REGEX = /^(?:dear|hi|hello|sehr geehrte(?:r)?|guten tag|hallo|liebe(?:r)?|frau|herr)\b/i
const NAME_GREETING_REGEX = /^[A-Z][\p{L}\p{M}'Ã¢â‚¬â„¢-]+(?: [A-Z][\p{L}\p{M}'Ã¢â‚¬â„¢-]+){1,3},$/u
const TITLE_GREETING_REGEX = /\b(?:miss|mr|mrs|ms|dr)\b.*,$/i
const TITLE_COMMA_HELPER = /\b(?:miss|mr|mrs|ms|dr)\b.*,$/i
const SIGNATURE_REGEX = /^(?:kind regards|regards|best regards|yours sincerely|sincerely|thanks|thank you),?$/i
const SIGNATURE_NAME_REGEX = /^(?:mr|mrs|ms|miss|dr)\b.*$/i

const DATE_PREFIX_REGEX = /^(?:mon|tue|wed|thu|fri|sat|sun)\b/i
const TIME_INDICATOR_REGEX = /(ago|am|pm|:\d{2})/i

function dropIfUiChrome(line: string): string | null {
  const lower = line.toLowerCase().trim()

  if (UI_CHROME_KEYWORDS.includes(lower)) {
    return "ui-navigation"
  }

  if (/^(?:summarise this email|reply|forward|share in chat|open in|upgrade)/i.test(line)) {
    return "ui-action"
  }

  if (/^\d{1,4}\+?$/.test(line)) {
    return "ui-badge"
  }

  if (/^[\p{P}\p{S}]+$/u.test(line)) {
    return "symbol-noise"
  }

  if (line.length === 1 && /^[A-Z]$/i.test(line)) {
    return "single-letter"
  }

  if (DATE_PREFIX_REGEX.test(lower) && TIME_INDICATOR_REGEX.test(lower) && lower.length < 50) {
    return "timestamp"
  }

  if (/^(?:to:|from:)/i.test(line) && line.length < 40) {
    return "header-meta"
  }
  if (/\bto me\b/i.test(line) && line.length < 40) {
    return "header-meta"
  }

  if (lower === "active" || lower === "external") {
    return "header-meta"
  }

  return null
}

function normalizeSpaces(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function isContentLike(text: string) {
  const letterMatches = text.match(/[A-Za-z]/g)?.length ?? 0
  if (letterMatches < 6) return false
  if (text.length < 3) return false
  if (text === text.toUpperCase() && text.length > 40) return false
  return true
}

function shouldForceParagraphBreak(prev: string, current: string) {
  const prevEndsWithPunctuation = /[.!?]$/.test(prev)
  const currentStartsWithCapital = /^[A-Z]/.test(current)
  return prev.length < 50 && prevEndsWithPunctuation && currentStartsWithCapital
}

function computeStart(kept: LineEntry[]): DetectionResult {
  for (let i = 0; i < kept.length; i += 1) {
    const { text } = kept[i]
    if (GREETING_REGEX.test(text)) {
      return { index: i, type: "greeting" }
    }
    if (NAME_GREETING_REGEX.test(text)) {
      return { index: i, type: "greeting" }
    }
    if (TITLE_GREETING_REGEX.test(text)) {
      return { index: i, type: "greeting" }
    }
  }

  const titleCommaLine = kept.findIndex((entry, idx) => {
    if (idx >= 30) return false
    return /,$/.test(entry.text) && TITLE_COMMA_HELPER.test(entry.text)
  })
  if (titleCommaLine >= 0) {
    return { index: titleCommaLine, type: "greeting" }
  }

  const contentFallback = kept.findIndex((entry) => isContentLike(entry.text))
  if (contentFallback >= 0) {
    return { index: contentFallback, type: "content" }
  }

  return { index: 0, type: "raw" }
}

function computeEnd(kept: LineEntry[]): DetectionResult {
  for (let i = kept.length - 1; i >= 0; i -= 1) {
    if (SIGNATURE_REGEX.test(kept[i].text)) {
      return {
        index: Math.min(kept.length - 1, i + 2),
        type: "signature",
        signatureIndex: i,
      }
    }
  }

  for (let i = kept.length - 1; i >= 0; i -= 1) {
    if (SIGNATURE_NAME_REGEX.test(kept[i].text) && kept[i].text.length < 40) {
      return {
        index: Math.min(kept.length - 1, i + 1),
        type: "signature",
        signatureIndex: i,
      }
    }
  }

  for (let i = kept.length - 1; i >= 0; i -= 1) {
    if (isContentLike(kept[i].text)) {
      return { index: i, type: "content" }
    }
  }

  return { index: kept.length - 1, type: "raw" }
}

function rebuildParagraphs(lines: LineEntry[]) {
  if (lines.length === 0) return ""
  const builder: string[] = [lines[0].text]

  for (let i = 1; i < lines.length; i += 1) {
    const current = lines[i]
    const prev = lines[i - 1]
    let prefix = "\n"
    if (current.blankBefore > 0) {
      prefix = "\n\n"
    } else if (shouldForceParagraphBreak(prev.text, current.text)) {
      prefix = "\n\n"
    }
    builder.push(`${prefix}${current.text}`)
  }

  return builder.join("").trim()
}

export function cleanOcrText(raw: string): CleanOcrResult {
  const normalizedRaw = raw.replace(/\r\n?/g, "\n")
  const lines = normalizedRaw.split("\n")
  const keptLines: LineEntry[] = []
  const removalDetails: { text: string; reason: string }[] = []
  const reasonCounts: Record<string, number> = {}
  let blankStreak = 0

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (!trimmed) {
      blankStreak += 1
      continue
    }

    const normalized = normalizeSpaces(trimmed)
    const reason = dropIfUiChrome(normalized)
    if (reason) {
      removalDetails.push({ text: normalized, reason })
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1
      continue
    }

    keptLines.push({
      text: normalized,
      index,
      blankBefore: blankStreak,
    })
    blankStreak = 0
  }

  if (keptLines.length === 0) {
    const fallbackClean = normalizeSpaces(normalizedRaw)
    return {
      cleanText: fallbackClean,
      confidence: 0,
      removedLines: removalDetails.length,
      debug: {
        keptLines: [],
        removedLines: removalDetails.map((entry) => entry.text),
        reasonCounts,
      },
    }
  }

  const startDetection = computeStart(keptLines)
  const endDetection = computeEnd(keptLines)
  let startIndex = Math.min(startDetection.index, keptLines.length - 1)
  let endIndex = Math.max(Math.min(endDetection.index, keptLines.length - 1), startIndex)
  const greetingDetected = startDetection.type === "greeting"
  const signatureDetected = endDetection.type === "signature"
  const earliestStartIndex = greetingDetected ? startDetection.index : 0

  const expandSlice = () => {
    const selection = keptLines.slice(startIndex, endIndex + 1)
    const length = selection.reduce((acc, entry) => acc + entry.text.length, 0)
    if (length >= 200) return false

    let expanded = false
    if (startIndex > earliestStartIndex && isContentLike(keptLines[startIndex - 1].text)) {
      startIndex -= 1
      expanded = true
    }
    if (endIndex < keptLines.length - 1 && isContentLike(keptLines[endIndex + 1].text)) {
      endIndex += 1
      expanded = true
    }
    return expanded
  }

  while (expandSlice()) {
    // keep expanding until we reach >= 200 chars or run out of content
  }

  if (endIndex < startIndex) {
    startIndex = 0
    endIndex = keptLines.length - 1
  }

  const selectedLines = keptLines.slice(startIndex, endIndex + 1)
  const cleanText = rebuildParagraphs(selectedLines)
  const finalClean = cleanText || normalizeSpaces(normalizedRaw)
  const punctuationMatches = finalClean.match(/[.!?]/g)?.length ?? 0
  let confidence = 0
  if (greetingDetected) confidence += 0.2
  if (signatureDetected) confidence += 0.2
  if (removalDetails.length >= 10 && finalClean.length > 400) confidence += 0.2
  if (punctuationMatches >= 3) confidence += 0.2
  if (confidence > 1) confidence = 1

  return {
    cleanText: finalClean,
    confidence,
    removedLines: removalDetails.length,
    debug: {
      keptLines: selectedLines.map((line) => line.text),
      removedLines: removalDetails.map((entry) => entry.text),
      reasonCounts,
      boundaries: { start: startIndex, end: endIndex },
    },
  }
}

