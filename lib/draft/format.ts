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

const SALUTATION_NORMALIZATION_REGEX =
  /^(Dear\s+(?:Mr|Mrs|Ms|Miss|Dr|Prof|Mx|Sir|Madam|Teacher)\.?)[\s\r\n]+([^\r\n,]+)(,?)/imu

const SALUTATION_TITLE_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Mx", "Sir", "Madam", "Teacher"]

const SALUTATION_BREAK_RE = new RegExp(
  `^Dear(?:\\s+(${SALUTATION_TITLE_TITLES.join("|")})\\.?)?$`,
  "i",
)
const SALUTATION_NAME_LINE_RE = /^([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'.\-\s]{0,40}),\s*(.*)$/u
const SALUTATION_PARAGRAPH_RE = /^Dear\s+(Mr|Mrs|Ms|Miss|Dr|Prof|Mx|Sir|Madam|Teacher)\.?$/i
const SALUTATION_NAME_PARAGRAPH_RE = /^([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'.\-\s]{0,40})(,?)$/u
const SALUTATION_NAME_BLACKLIST = ["thank", "thanks", "please", "i", "we", "your", "could", "would", "hope", "happy"]
const GERMAN_SALUTATION_RE =
  /^(Sehr geehrte|Sehr geehrter|Liebe|Lieber|Guten Tag|Hallo)\s+(Frau|Herr)(?:\s+(Dr|Prof)\.?)?$/i

function normalizeSalutationBreaks(text: string, locale?: string) {
  const normalized = text.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")

  let index = 0
  while (index < lines.length) {
    const currentLine = lines[index]
    const trimmedLine = currentLine.trim()
    if (!trimmedLine) {
      index += 1
      continue
    }
    const englishMatch = trimmedLine.match(SALUTATION_BREAK_RE)
    const germanMatch = englishMatch ? null : trimmedLine.match(GERMAN_SALUTATION_RE)
    if (!englishMatch && !germanMatch) {
      index += 1
      continue
    }
    let nextIndex = index + 1
    while (nextIndex < lines.length && !lines[nextIndex].trim()) {
      lines.splice(nextIndex, 1)
    }
    if (nextIndex >= lines.length) {
      break
    }
    const nextLine = lines[nextIndex]
    const nextTrimmed = nextLine.trim()
    const nameMatch = nextTrimmed.match(SALUTATION_NAME_LINE_RE)
    if (!nameMatch) {
      break
    }
    let titleSegment = ""
    let greetingPrefix = ""
    if (englishMatch) {
      titleSegment = englishMatch[1] ? englishMatch[1].replace(/\.\s*$/, "") : ""
      greetingPrefix = "Dear"
    } else if (germanMatch) {
      const allowGermanMerge =
        !!locale && locale.toLowerCase().startsWith("de") || /\bBetreff\b/i.test(text)
      if (!allowGermanMerge) {
        index += 1
        continue
      }
      const greeting = germanMatch[1]
      const role = germanMatch[2]
      const extra = germanMatch[3]
      const parts = [greeting, role]
      if (extra) {
        parts.push(extra.replace(/\.\s*$/, ""))
      }
      titleSegment = parts.filter(Boolean).join(" ")
    }
    if (!titleSegment) {
      break
    }
    const baseName = nameMatch[1].trim()
    const nameParts = baseName.split(/\s+/).filter(Boolean)
    if (!nameParts.length || nameParts.length > 3) {
      break
    }
    const normalizedBaseName = baseName.toLowerCase()
    if (SALUTATION_NAME_BLACKLIST.some((token) => normalizedBaseName.startsWith(token))) {
      break
    }
    const combinedName = titleSegment ? `${titleSegment} ${nameParts.join(" ")}` : nameParts.join(" ")
    const salutationLine = greetingPrefix ? `${greetingPrefix} ${combinedName},` : `${combinedName},`
    lines[index] = salutationLine
    const remainder = nameMatch[2]?.trim()
    if (remainder) {
      lines[nextIndex] = remainder
    } else {
      lines.splice(nextIndex, 1)
    }
    break
  }

  return lines.join("\n")
}

function normalizeGreetingNewline(value: string, locale?: string) {
  const salutationFixed = normalizeSalutationBreaks(value, locale)
  return salutationFixed.replace(
    SALUTATION_NORMALIZATION_REGEX,
    (match, prefix, name, comma) => {
      const normalizedPrefix = prefix.replace(/\.\s*$/, "").trim()
      const normalizedName = name.replace(/\s+/g, " ").trim()
      const nameWords = normalizedName.split(/\s+/).filter(Boolean)
      const normalizedNameLower = normalizedName.toLowerCase()
      if (
        !normalizedName ||
        nameWords.length === 0 ||
        nameWords.length > 3 ||
        SALUTATION_NAME_BLACKLIST.some((token) => normalizedNameLower.startsWith(token))
      ) {
        return match
      }
      const commaToken = comma || ","
      return `${normalizedPrefix} ${normalizedName}${commaToken}`
    },
  )
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

function normalizeSalutationParagraphs(paragraphs: string[]): string[] {
  if (!paragraphs.length || paragraphs.length < 2) {
    return paragraphs
  }
  const first = paragraphs[0].trim()
  const salutationMatch = first.match(SALUTATION_PARAGRAPH_RE)
  if (!salutationMatch) {
    return paragraphs
  }
  const second = paragraphs[1].trim()
  const nameMatch = second.match(SALUTATION_NAME_PARAGRAPH_RE)
  if (!nameMatch) {
    return paragraphs
  }
  const nameWords = nameMatch[1].trim().split(/\s+/).filter(Boolean)
  if (!nameWords.length || nameWords.length > 3) {
    return paragraphs
  }
  const proseBlacklist = ["thank", "thanks", "please", "i", "we", "your", "could", "would", "hope", "happy"]
  if (proseBlacklist.some((token) => nameMatch[1].trim().toLowerCase().startsWith(token))) {
    return paragraphs
  }
  const title = salutationMatch[1]
  const commaToken = nameMatch[2] || ","
  const combined = `Dear ${title} ${nameMatch[1].trim()}${commaToken}`
  return [combined, ...paragraphs.slice(2)]
}

export function formatDraftText(text: string, locale?: string): DraftStructure {
  const normalized = normalizeGreetingNewline(
    stripMarkdown(text).replace(/\r\n/g, "\n"),
    locale,
  ).trim()
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
  const normalizedParagraphs = normalizeSalutationParagraphs(paragraphs)
  return {
    subject,
    paragraphs: normalizedParagraphs,
  }
}
