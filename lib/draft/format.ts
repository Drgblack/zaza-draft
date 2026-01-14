import { parseLanguageCandidate } from "./language"

export interface DraftStructure {
  subject?: string
  paragraphs: string[]
}

const GREETING_REGEX =
  /^\s*(Dear|Hi|Hello|Parents|Family|Team|Good (?:morning|afternoon|evening)|Liebe|Guten Tag|Hallo|Sehr geehrte)/i
export const CLOSING_REGEX =
  /\b(?:Kind|Warm|Best|Many)\s+regards,|Sincerely,|Yours sincerely,|Best wishes,|With thanks,|Thanks,|Mit freundlichen Grüßen,|Mit freundlichen Gruessen,|Herzliche Grüße,|Herzliche Gruesse,/i
const SUBJECT_LABELS = ["Subject", "Betreff"] as const
const SUBJECT_REGEX = new RegExp(
  `^\\s*(?:${SUBJECT_LABELS.join("|")})\\s*[:\\-–—：]\\s*(.+?)(?=(?:\\n|Dear\\b|Hi\\b|Hello\\b|Parents\\b|Family\\b|Team\\b|Good\\b|Liebe\\b|Guten Tag\\b|Hallo\\b|Sehr geehrte\\b|$))`,
  "i",
)
const PARAGRAPH_BREAK_REGEX = /\n\s*\n+/
const SINGLELINE_BREAK_REGEX = /\n+/
const SENTENCE_LENGTH_THRESHOLD = 360
const LONG_TEXT_LENGTH = 420
const MAX_SENTENCES_PER_PARAGRAPH = 3
const DEFAULT_LOCALE = "en-US"
const GERMAN_PARAGRAPH_MIN = 3
const GERMAN_PARAGRAPH_MAX = 5
const GERMAN_PREFERRED_PARAGRAPHS = 4
const GERMAN_PARAGRAPH_BODY_LENGTH_THRESHOLD = 240

function stripMarkdown(value: string) {
  return value.replace(/\*\*([\s\S]*?)\*\*/g, "$1").replace(/__([\s\S]*?)__/g, "$1")
}

function splitClosingParagraph(paragraph: string): string[] {
  const closingMatch = paragraph.match(CLOSING_REGEX)
  if (closingMatch && !CLOSING_REGEX.test(paragraph.trimEnd())) {
    const index = paragraph.search(CLOSING_REGEX)
    if (index > 0) {
      return [paragraph.slice(0, index).trim(), paragraph.slice(index).trim()]
    }
  }
  return [paragraph]
}

function resolveParagraphs(paragraphs: string[]): string[] {
  return paragraphs.flatMap(splitClosingParagraph).filter(Boolean)
}

function getLocaleForSegmenter(locale?: string) {
  if (!locale) {
    return DEFAULT_LOCALE
  }
  if (locale.toLowerCase().startsWith("de")) {
    return "de-DE"
  }
  return locale
}

function getSentencesFromText(body: string, locale?: string) {
  const normalizedLocale = getLocaleForSegmenter(locale)
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(normalizedLocale, { granularity: "sentence" })
      const sentences = Array.from(segmenter.segment(body), (segment) => segment.segment.trim())
      const filtered = sentences.filter(Boolean)
      if (filtered.length) {
        return filtered
      }
    } catch {
      // fallback to regex split
    }
  }

  return body
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function chunkSentencesIntoParagraphs(sentences: string[]) {
  if (!sentences.length) {
    return []
  }

  const paragraphs: string[] = []
  let buffer: string[] = []
  let currentLength = 0

  const flushBuffer = () => {
    if (!buffer.length) {
      return
    }
    paragraphs.push(buffer.join(" ").trim())
    buffer = []
    currentLength = 0
  }

  for (const sentence of sentences) {
    if (
      buffer.length >= MAX_SENTENCES_PER_PARAGRAPH ||
      currentLength + sentence.length > SENTENCE_LENGTH_THRESHOLD
    ) {
      flushBuffer()
    }
    buffer.push(sentence)
    currentLength += sentence.length
  }

  flushBuffer()
  return resolveParagraphs(paragraphs.filter(Boolean))
}

function isGermanLocale(locale?: string) {
  return parseLanguageCandidate(locale ?? undefined) === "de"
}

function chunkSentencesEvenly(sentences: string[], targetCount: number) {
  if (!sentences.length || targetCount <= 0) {
    return []
  }

  const actualTarget = Math.min(targetCount, sentences.length)
  const baseSize = Math.floor(sentences.length / actualTarget)
  let remainder = sentences.length - baseSize * actualTarget
  const chunks: string[] = []
  let cursor = 0

  for (let i = 0; i < actualTarget; i++) {
    const size = baseSize + (remainder > 0 ? 1 : 0)
    if (remainder > 0) {
      remainder -= 1
    }
    if (size <= 0) {
      continue
    }
    const chunk = sentences.slice(cursor, cursor + size).join(" ").trim()
    cursor += size
    if (chunk) {
      chunks.push(chunk)
    }
  }

  const leftover = sentences.slice(cursor).join(" ").trim()
  if (leftover) {
    if (chunks.length) {
      const lastIndex = chunks.length - 1
      chunks[lastIndex] = `${chunks[lastIndex]} ${leftover}`.trim()
    } else {
      chunks.push(leftover)
    }
  }

  return chunks
}

function determineGermanBodyParagraphCount(
  sentenceCount: number,
  hasGreeting: boolean,
  hasClosing: boolean,
) {
  const extras = Number(hasGreeting) + Number(hasClosing)
  const bodySlots = Math.max(1, GERMAN_PREFERRED_PARAGRAPHS - extras)
  return Math.min(sentenceCount, bodySlots)
}

function synthesizeGermanParagraphs(sentences: string[]) {
  if (!sentences.length) {
    return []
  }

  const working = [...sentences]
  let greeting: string | null = null
  if (working.length && GREETING_REGEX.test(working[0])) {
    greeting = working.shift()!.trim()
  }

  let closingParagraph: string | null = null
  const closingIndex = working.findIndex((sentence) => CLOSING_REGEX.test(sentence))
  if (closingIndex >= 0) {
    closingParagraph = working.slice(closingIndex).join(" ").trim()
    working.splice(closingIndex)
  }

  const bodySentences = working.filter(Boolean)
  const bodyParagraphCount = determineGermanBodyParagraphCount(
    bodySentences.length,
    Boolean(greeting),
    Boolean(closingParagraph),
  )
  const bodyParagraphs = chunkSentencesEvenly(bodySentences, bodyParagraphCount)

  const assembled = [
    ...(greeting ? [greeting] : []),
    ...bodyParagraphs,
    ...(closingParagraph ? [closingParagraph] : []),
  ]

  const resolved = resolveParagraphs(assembled.filter(Boolean))
  if (resolved.length >= 2) {
    return resolved
  }

  if (sentences.length > 1) {
    const mid = Math.ceil(sentences.length / 2)
    return resolveParagraphs([
      sentences.slice(0, mid).join(" ").trim(),
      sentences.slice(mid).join(" ").trim(),
    ])
  }

  return resolved
}

function buildParagraphs(body: string, locale?: string): string[] {
  const trimmedBody = body.replace(/\r\n/g, "\n").trim()
  if (!trimmedBody) {
    return []
  }

  const newlineParagraphs = trimmedBody
    .split(PARAGRAPH_BREAK_REGEX)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (newlineParagraphs.length > 1) {
    return resolveParagraphs(newlineParagraphs)
  }

  const singleLineParagraphs = trimmedBody
    .split(SINGLELINE_BREAK_REGEX)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  if (singleLineParagraphs.length > 1) {
    return resolveParagraphs(singleLineParagraphs)
  }

  const sentenceCandidates = getSentencesFromText(trimmedBody, locale)
  let sentences = [...sentenceCandidates]

  const paragraphs: string[] = []
  if (!sentences.length) {
    return paragraphs
  }

  if (GREETING_REGEX.test(sentences[0])) {
    paragraphs.push(sentences.shift()!)
  }

  let closingParagraph: string | null = null
  const closingIndex = sentences.findIndex((sentence) => CLOSING_REGEX.test(sentence))
  if (closingIndex >= 0) {
    closingParagraph = sentences.slice(closingIndex).join(" ").trim()
    sentences.splice(closingIndex)
  }

  if (sentences.length) {
    paragraphs.push(...chunkSentencesIntoParagraphs(sentences))
  }

  if (closingParagraph) {
    paragraphs.push(closingParagraph)
  }

  const localeIsGerman = isGermanLocale(locale)
  const shouldForceGerman =
    localeIsGerman &&
    paragraphs.length <= 2 &&
    (trimmedBody.length > GERMAN_PARAGRAPH_BODY_LENGTH_THRESHOLD || sentenceCandidates.length >= 3)
  if (shouldForceGerman) {
    return synthesizeGermanParagraphs([...sentenceCandidates])
  }

  if (paragraphs.length === 1 && trimmedBody.length > LONG_TEXT_LENGTH && sentenceCandidates.length > 1) {
    const mid = Math.ceil(sentenceCandidates.length / 2)
    const first = sentenceCandidates.slice(0, mid).join(" ").trim()
    const second = sentenceCandidates.slice(mid).join(" ").trim()
    return resolveParagraphs([first, second])
  }

  return paragraphs
}

export function formatDraftText(text: string, locale?: string): DraftStructure {
  const normalized = stripMarkdown(text).replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return { paragraphs: [] }
  }

  let subject: string | undefined
  let bodyText = normalized

  const subjectMatch = normalized.match(SUBJECT_REGEX)
  if (subjectMatch) {
    let subjectContent = subjectMatch[1].trim()
    const greetingIndex = subjectContent.search(GREETING_REGEX)
    if (greetingIndex >= 0) {
      const greetingPortion = subjectContent.slice(greetingIndex).trim()
      subjectContent = subjectContent.slice(0, greetingIndex).trim()
      bodyText = `${greetingPortion}\n${normalized.slice(subjectMatch[0].length)}`.trim()
    } else {
      bodyText = normalized.slice(subjectMatch[0].length).trim()
    }
    subject = subjectContent || undefined
  }

  const paragraphs = buildParagraphs(bodyText, locale)
  return {
    subject,
    paragraphs,
  }
}
