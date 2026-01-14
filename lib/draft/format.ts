export interface DraftStructure {
  subject?: string
  paragraphs: string[]
}

const GREETING_REGEX =
  /^\s*(Dear|Hi|Hello|Parents|Family|Team|Good (?:morning|afternoon|evening)|Liebe|Guten Tag|Hallo|Sehr geehrte)/i
export const CLOSING_REGEX =
  /\b(?:Kind|Warm|Best|Many)\s+regards,|Sincerely,|Yours sincerely,|Best wishes,|With thanks,|Thanks,|Mit freundlichen Grüßen,|Herzliche Grüße,/i
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
