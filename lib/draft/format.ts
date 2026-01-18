export interface DraftStructure {
  subject?: string
  paragraphs: string[]
}

const GREETING_REGEX =
  /^\s*(Dear|Hi|Hello|Parents|Family|Team|Good (?:morning|afternoon|evening)|Liebe|Guten Tag|Hallo|Sehr geehrte)/i
export const CLOSING_REGEX =
  /\b(?:Kind|Warm|Best|Many)\s+regards,|Sincerely,|Yours sincerely,|Best wishes,|With thanks,|Thanks,|Mit freundlichen Grüßen,|Mit freundlichen Gruessen,|Herzliche Grüße,|Herzliche Gruesse,/i
const SUBJECT_LABELS = ["Subject", "Betreff"] as const
const SUBJECT_SEPARATOR_REGEX = "[:\\-–—|]+"
const SUBJECT_REGEX = new RegExp(
  `^\\s*(?:${SUBJECT_LABELS.join("|")})\\s*(?:${SUBJECT_SEPARATOR_REGEX})\\s*(.+?)(?=(?:\\n|Dear\\b|Hi\\b|Hello\\b|Parents\\b|Family\\b|Team\\b|Good\\b|Liebe\\b|Guten Tag\\b|Hallo\\b|Sehr geehrte\\b|$))`,
  "i",
)
const SENTENCE_SPLIT_REGEX = /(?<=[.!?…])\s+(?=[A-ZÄÖÜẞ]|[„“"'])/
const PARAGRAPH_TARGET_CHUNK_SIZE = 320
const MEDIUM_BODY_THRESHOLD = 280
const LONG_BODY_THRESHOLD = 600
const MAX_PARAGRAPHS = 6
const MIN_SENTENCES_FOR_MULTIPLE_PARAGRAPHS = 3
// Soft limit for paragraph length; prefer splitting at sentence boundaries and allow single sentences to exceed the threshold.
export const MAX_PARAGRAPH_CHARS = 560

function stripMarkdown(value: string) {
  return value.replace(/\*\*([\s\S]*?)\*\*/g, "$1").replace(/__([\s\S]*?)__/g, "$1")
}

function getLocaleForSegmenter(locale?: string) {
  if (!locale) {
    return "en-US"
  }
  if (locale.toLowerCase().startsWith("de")) {
    return "de-DE"
  }
  return locale
}

function getSentencesFromText(body: string, locale?: string) {
  const normalizedLocale = getLocaleForSegmenter(locale)
  const normalizedBody = body.replace(/\s+/g, " ").trim()
  if (!normalizedBody) {
    return []
  }

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(normalizedLocale, { granularity: "sentence" })
      const sentences = Array.from(segmenter.segment(normalizedBody), (segment) => segment.segment.trim())
      const filtered = sentences.filter(Boolean)
      if (filtered.length) {
        return filtered
      }
    } catch {
      // fallback to regex
    }
  }

  return normalizedBody
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function splitLeadingGreeting(sentences: string[], trimmedBody: string, locale?: string) {
  if (!locale?.toLowerCase().startsWith("de")) {
    return sentences
  }
  if (!sentences.length) {
    return sentences
  }
  const first = sentences[0]
  if (!GREETING_REGEX.test(first)) {
    return sentences
  }
  const commaIndex = first.indexOf(",")
  if (commaIndex < 0) {
    return sentences
  }
  const greetingFragment = first.slice(0, commaIndex + 1).trim()
  const remainder = first.slice(commaIndex + 1).trim()
  if (!greetingFragment || !remainder) {
    return sentences
  }
  const offset = trimmedBody.indexOf(greetingFragment)
  if (offset !== 0) {
    return sentences
  }
  return [greetingFragment, remainder, ...sentences.slice(1)]
}

function calculateMinParagraphCount(bodyLength: number, sentenceCount: number) {
  if (bodyLength > LONG_BODY_THRESHOLD && sentenceCount >= MIN_SENTENCES_FOR_MULTIPLE_PARAGRAPHS) {
    return 3
  }
  if (bodyLength > MEDIUM_BODY_THRESHOLD && sentenceCount >= MIN_SENTENCES_FOR_MULTIPLE_PARAGRAPHS) {
    return 2
  }
  return 1
}

function determineBodyParagraphCount(bodyLength: number, sentenceCount: number, minParagraphs: number) {
  if (!sentenceCount) {
    return 0
  }
  const baseByLength = Math.max(1, Math.ceil(bodyLength / PARAGRAPH_TARGET_CHUNK_SIZE))
  const desired = Math.max(minParagraphs, baseByLength)
  const boundedByMax = Math.min(MAX_PARAGRAPHS, desired)
  return Math.min(boundedByMax, sentenceCount)
}

function chunkSentencesIntoGroups(sentences: string[], targetCount: number) {
  if (!sentences.length || targetCount <= 0) {
    return []
  }

  const actualCount = Math.min(targetCount, sentences.length)
  const baseSize = Math.floor(sentences.length / actualCount)
  let remainder = sentences.length - baseSize * actualCount
  const paragraphs: string[] = []
  let cursor = 0

  for (let i = 0; i < actualCount; i++) {
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
      paragraphs.push(chunk)
    }
  }

  const leftover = sentences.slice(cursor).join(" ").trim()
  if (leftover) {
    if (paragraphs.length) {
      const lastIndex = paragraphs.length - 1
      paragraphs[lastIndex] = `${paragraphs[lastIndex]} ${leftover}`.trim()
    } else {
      paragraphs.push(leftover)
    }
  }

  return paragraphs
}

function isGreetingParagraph(paragraph: string) {
  return GREETING_REGEX.test(paragraph)
}

function isClosingParagraph(paragraph: string) {
  return CLOSING_REGEX.test(paragraph)
}

function splitParagraphByMaxLength(paragraph: string, locale?: string) {
  const sentences = getSentencesFromText(paragraph, locale)
  if (sentences.length <= 1) {
    return [paragraph]
  }

  const parts: string[] = []
  let buffer = sentences[0]

  for (let i = 1; i < sentences.length; i++) {
    const sentence = sentences[i]
    const candidate = `${buffer} ${sentence}`.trim()
    if (candidate.length > MAX_PARAGRAPH_CHARS && buffer.length <= MAX_PARAGRAPH_CHARS) {
      parts.push(buffer)
      buffer = sentence
      continue
    }
    if (candidate.length > MAX_PARAGRAPH_CHARS && buffer.length > MAX_PARAGRAPH_CHARS) {
      // allow overflow when a single sentence already exceeds the limit rather than splitting mid-sentence
      parts.push(buffer)
      buffer = sentence
      continue
    }
    buffer = candidate
  }

  if (buffer) {
    parts.push(buffer)
  }

  return parts
}

function enforceMaxParagraphLength(paragraphs: string[], locale?: string) {
  const resolved: string[] = []
  for (const paragraph of paragraphs) {
    if (
      paragraph.length <= MAX_PARAGRAPH_CHARS ||
      isGreetingParagraph(paragraph) ||
      isClosingParagraph(paragraph)
    ) {
      resolved.push(paragraph)
      continue
    }

    const split = splitParagraphByMaxLength(paragraph, locale)
    resolved.push(...split)
  }
  return resolved
}

function buildParagraphs(body: string, locale?: string): string[] {
  const trimmedBody = body.replace(/\r\n/g, "\n").trim()
  if (!trimmedBody) {
    return []
  }

  const sentenceCandidates = getSentencesFromText(trimmedBody, locale)
  if (!sentenceCandidates.length) {
    return [trimmedBody]
  }

  const normalizedSentences = splitLeadingGreeting(sentenceCandidates, trimmedBody, locale)
  const sentences = [...normalizedSentences]
  let greeting: string | null = null
  if (sentences.length && GREETING_REGEX.test(sentences[0])) {
    greeting = sentences.shift()!.trim()
  }

  let closingParagraph: string | null = null
  const closingIndex = sentences.findIndex((sentence) => CLOSING_REGEX.test(sentence))
  if (closingIndex >= 0) {
    closingParagraph = sentences.slice(closingIndex).join(" ").trim()
    sentences.splice(closingIndex)
  }

  const bodySentences = sentences.filter(Boolean)
  const bodyLength = bodySentences.join(" ").length
  const minParagraphs = calculateMinParagraphCount(bodyLength, bodySentences.length)
  const paragraphCount = determineBodyParagraphCount(bodyLength, bodySentences.length, minParagraphs)
  const bodyParagraphs = chunkSentencesIntoGroups(bodySentences, paragraphCount)

  const assembled = [
    ...(greeting ? [greeting] : []),
    ...bodyParagraphs,
    ...(closingParagraph ? [closingParagraph] : []),
  ].filter(Boolean)

  if (assembled.length) {
    return enforceMaxParagraphLength(assembled, locale)
  }

  return enforceMaxParagraphLength([trimmedBody], locale)
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
