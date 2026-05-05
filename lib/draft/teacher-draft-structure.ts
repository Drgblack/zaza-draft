import { CLOSING_REGEX, type DraftStructure } from "@/lib/draft/format"

export type TeacherDraftStructureViolationType =
  | "PARAGRAPH_COUNT_DRIFT"
  | "SENTENCE_COUNT_DRIFT"
  | "WORD_COUNT_DRIFT"
  | "MISSING_DETAIL_ANCHOR"

export interface TeacherDraftStructureViolation {
  type: TeacherDraftStructureViolationType
  detail: string
}

export interface TeacherDraftStructureAssessment {
  sourceParagraphCount: number
  candidateParagraphCount: number
  sourceSentenceCount: number
  candidateSentenceCount: number
  sourceWordCount: number
  candidateWordCount: number
  missingAnchors: string[]
  violations: TeacherDraftStructureViolation[]
  shouldPreserveSource: boolean
}

const DATE_PATTERN =
  /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}[/-]\d{2}[/-]\d{2}|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b(?:\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)?)/gi

const QUOTED_PHRASE_PATTERN = /["“](.{1,80}?)["”]|'(.{1,80}?)'/g

const NAME_PATTERN =
  /\b(?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?\b|\b[A-Z][\p{L}'’-]{2,}(?:\s+[A-Z]\.)?\b/gu

const NAME_STOPWORDS = new Set([
  "Dear",
  "Hello",
  "Hi",
  "The",
  "This",
  "These",
  "That",
  "Those",
  "My",
  "Our",
  "At",
  "On",
  "During",
  "Further",
  "Thank",
  "Kind",
  "Regards",
  "Best",
  "Thanks",
  "Please",
  "Tomorrrow",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
])

const LIST_PHRASE_STOPWORDS = new Set([
  "i",
  "we",
  "you",
  "he",
  "she",
  "they",
  "it",
  "this",
  "that",
  "these",
  "those",
  "and",
  "but",
  "or",
  "because",
  "with",
  "without",
  "during",
  "before",
  "after",
  "when",
  "while",
  "please",
  "could",
  "would",
  "should",
  "will",
  "was",
  "were",
  "is",
  "are",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
])

const SUBJECT_LINE_REGEX = /^(?:Subject|Betreff)\s*[:\-–—|]+\s*(.+)$/i

function normalizeAnchor(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s.'’-]+/gu, " ").replace(/\s+/g, " ").trim()
}

function countWords(text: string) {
  return normalizeAnchor(text).split(" ").filter(Boolean).length
}

function splitSentences(text: string) {
  return (
    text
      .match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? []
  )
}

function hasClarityOverrideOpportunity(sentences: string[]) {
  return sentences.some((sentence) => {
    const wordCount = countWords(sentence)
    const clauseSeparators = (sentence.match(/[;,]/g) ?? []).length
    return wordCount > 40 || clauseSeparators >= 2
  })
}

export function formatTeacherDraftLiteralStructure(text: string): DraftStructure {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return { paragraphs: [] }
  }

  const lines = normalized.split("\n")
  let subject: string | undefined
  let startIndex = 0

  while (startIndex < lines.length && !lines[startIndex].trim()) {
    startIndex += 1
  }

  const subjectMatch = lines[startIndex]?.trim().match(SUBJECT_LINE_REGEX)
  if (subjectMatch) {
    subject = subjectMatch[1]?.trim() || undefined
    startIndex += 1
    while (startIndex < lines.length && !lines[startIndex].trim()) {
      startIndex += 1
    }
  }

  const bodyText = lines.slice(startIndex).join("\n").trim()
  const paragraphs = bodyText
    ? bodyText
        .split(/\n\s*\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : []

  return {
    subject,
    paragraphs,
  }
}

function getBodyParagraphs(text: string, _language?: string, greetingLine?: string | null) {
  const structure = formatTeacherDraftLiteralStructure(text)
  const normalizedGreeting = greetingLine?.trim() ?? ""

  return structure.paragraphs.filter((paragraph, index) => {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      return false
    }
    if (index === 0 && normalizedGreeting && trimmed === normalizedGreeting) {
      return false
    }
    if (/^(?:Subject|Betreff)\s*[:\-–—|]/i.test(trimmed)) {
      return false
    }
    if (CLOSING_REGEX.test(trimmed)) {
      return false
    }
    return true
  })
}

function extractQuotedAnchors(text: string) {
  return Array.from(text.matchAll(QUOTED_PHRASE_PATTERN))
    .map((match) => normalizeAnchor(match[1] || match[2] || ""))
    .filter((anchor) => anchor.split(" ").length >= 2)
}

function extractDateAnchors(text: string) {
  return Array.from(text.matchAll(DATE_PATTERN))
    .map((match) => normalizeAnchor(match[0] || ""))
    .filter(Boolean)
}

function extractNameAnchors(text: string) {
  return Array.from(text.matchAll(NAME_PATTERN))
    .map((match) => (match[0] || "").trim())
    .filter(Boolean)
    .filter((anchor) => {
      const normalized = anchor.replace(/[.,]+$/g, "").trim()
      if (!normalized) {
        return false
      }
      const firstToken = normalized.split(/\s+/)[0]
      return !NAME_STOPWORDS.has(firstToken)
    })
    .map((anchor) => normalizeAnchor(anchor))
}

function isConcreteListPhrase(phrase: string) {
  const tokens = normalizeAnchor(phrase).split(" ").filter(Boolean)
  if (tokens.length === 0 || tokens.length > 4) {
    return false
  }
  if (tokens.every((token) => LIST_PHRASE_STOPWORDS.has(token))) {
    return false
  }
  if (tokens.some((token) => LIST_PHRASE_STOPWORDS.has(token))) {
    return false
  }
  return true
}

function extractConcreteListAnchors(text: string) {
  const anchors = new Set<string>()

  for (const paragraph of text.split(/\n+/)) {
    if ((paragraph.match(/,/g) ?? []).length < 2) {
      continue
    }

    const segments = paragraph
      .split(",")
      .flatMap((segment) => segment.split(/\band\b/i))
      .map((segment) => segment.trim())
      .filter(Boolean)

    for (const segment of segments) {
      if (!isConcreteListPhrase(segment)) {
        continue
      }
      anchors.add(normalizeAnchor(segment))
    }
  }

  return Array.from(anchors)
}

function extractDetailAnchors(text: string) {
  const normalizedText = text.replace(/\r\n/g, "\n")
  const anchors = new Set<string>()

  for (const anchor of extractNameAnchors(normalizedText)) {
    anchors.add(anchor)
  }
  for (const anchor of extractDateAnchors(normalizedText)) {
    anchors.add(anchor)
  }
  for (const anchor of extractQuotedAnchors(normalizedText)) {
    anchors.add(anchor)
  }
  for (const anchor of extractConcreteListAnchors(normalizedText)) {
    anchors.add(anchor)
  }

  return Array.from(anchors)
}

const TEACHER_DRAFT_SAFETY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bI was appalled by\b/gi, "I was concerned by"],
  [
    /\bI can(?:no|')t make individual exceptions when rules are in place, and I need to apply the same expectation consistently for all students\b/gi,
    "I need to apply the same expectation consistently for all students when rules are in place",
  ],
  [
    /\bI understand your concern, but I can(?:no|')t make individual exceptions and the rule remains the same for all students\b/gi,
    "I understand your concern, and the rule remains the same for all students",
  ],
  [
    /\bI can(?:no|')t make individual exceptions(?: in the moment)?(?:, as this would quickly become unmanageable across the class)?\b/gi,
    "I need to keep the same expectation in place for all students",
  ],
  [/\bthese expectations will remain in place\b/gi, "these expectations need to remain clear"],
  [/\bThe marking was fair and consistent, and I applied the criteria correctly\b/gi, "My aim is to apply the marking criteria consistently and fairly"],
  [/\bI do not think it is helpful to keep challenging this when the grade reflects the standard of the work\b/gi, "The grade reflects the standard of the work, and I am happy to clarify how the criteria were applied"],
  [/\bI think this request is unreasonable and I cannot offer special treatment here\b/gi, "I understand why you are asking, and I cannot offer an individual exception here"],
  [/\bThis request is unreasonable and I cannot offer special treatment here\b/gi, "I understand why you are asking, and I cannot offer an individual exception here"],
  [/\bI am tired of repeating this and I can(?:no|')t keep chasing homework every week\b/gi, "I need to keep the expectations around homework clear and consistent each week"],
  [/\bYour child needs to take this seriously because this is getting frustrating\b/gi, "Please speak with your child about this so the expectation remains clear"],
]

export function assessTeacherDraftStructuralPreservation(options: {
  sourceText: string
  candidateText: string
  language?: string
  greetingLine?: string | null
}): TeacherDraftStructureAssessment {
  const sourceParagraphs = getBodyParagraphs(
    options.sourceText,
    options.language,
    options.greetingLine,
  )
  const candidateParagraphs = getBodyParagraphs(
    options.candidateText,
    options.language,
    options.greetingLine,
  )
  const sourceBody = sourceParagraphs.join("\n\n")
  const candidateBody = candidateParagraphs.join("\n\n")
  const sourceSentences = splitSentences(sourceBody)
  const candidateSentences = splitSentences(candidateBody)
  const sourceWordCount = countWords(sourceBody)
  const candidateWordCount = countWords(candidateBody)
  const clarityAllowance = hasClarityOverrideOpportunity(sourceSentences) ? 1 : 0
  const sourceAnchors = extractDetailAnchors(sourceBody)
  const normalizedCandidate = normalizeAnchor(candidateBody)
  const missingAnchors = sourceAnchors.filter(
    (anchor) => anchor && !normalizedCandidate.includes(anchor),
  )
  const violations: TeacherDraftStructureViolation[] = []

  if (candidateParagraphs.length !== sourceParagraphs.length) {
    violations.push({
      type: "PARAGRAPH_COUNT_DRIFT",
      detail: `${sourceParagraphs.length}->${candidateParagraphs.length}`,
    })
  }

  if (
    candidateSentences.length < sourceSentences.length ||
    candidateSentences.length > sourceSentences.length + clarityAllowance
  ) {
    violations.push({
      type: "SENTENCE_COUNT_DRIFT",
      detail: `${sourceSentences.length}->${candidateSentences.length}`,
    })
  }

  const lowerBound = Math.floor(sourceWordCount * 0.7)
  const upperBound = Math.ceil(sourceWordCount * 1.3)
  if (candidateWordCount < lowerBound || candidateWordCount > upperBound) {
    violations.push({
      type: "WORD_COUNT_DRIFT",
      detail: `${sourceWordCount}->${candidateWordCount}`,
    })
  }

  if (missingAnchors.length > 0) {
    violations.push({
      type: "MISSING_DETAIL_ANCHOR",
      detail: missingAnchors.join(" | "),
    })
  }

  return {
    sourceParagraphCount: sourceParagraphs.length,
    candidateParagraphCount: candidateParagraphs.length,
    sourceSentenceCount: sourceSentences.length,
    candidateSentenceCount: candidateSentences.length,
    sourceWordCount,
    candidateWordCount,
    missingAnchors,
    violations,
    shouldPreserveSource: violations.length > 0,
  }
}

export function applyTeacherDraftSentenceLevelSafetyOverrides(text: string, language?: string) {
  if (language !== "en") {
    return text
  }

  let updated = text
  for (const [pattern, replacement] of TEACHER_DRAFT_SAFETY_REPLACEMENTS) {
    updated = updated.replace(pattern, (match) => {
      if (!match) {
        return replacement
      }

      const firstCharacter = match[0]
      if (firstCharacter === firstCharacter.toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1)
      }

      return replacement
    })
  }

  return updated
}
