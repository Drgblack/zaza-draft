import { CLOSING_REGEX } from "@/lib/draft/format"
import { formatTeacherDraftLiteralStructure } from "@/lib/draft/teacher-draft-structure"

export type TeacherDraftSuggestionType = "tone" | "clarity" | "professional_judgement"

export interface TeacherDraftSuggestion {
  id: string
  original: string
  suggestion: string
  type: TeacherDraftSuggestionType
}

export interface TeacherDraftAdvisoryDebugInfo {
  languageReceived: string
  normalizedLanguage: string
  languageGatePassed: boolean
  sentenceCount: number
  firstParsedSentences: string[]
  candidateCountBeforeVisibleFiltering: number
  candidateCountAfterVisibleFiltering: number
  filteredReasonCounts: {
    language_not_supported: number
    no_sentence_match: number
    filtered_already_resolved: number
    missing_visible_original: number
    unknown: number
  }
}

interface BuildTeacherDraftAdvisorySuggestionOptions {
  visibleDraftText?: string
  debug?: boolean
  onDebug?: (debug: TeacherDraftAdvisoryDebugInfo) => void
}

type SuggestionRule = {
  type: TeacherDraftSuggestionType
  matches: (sentence: string) => boolean
  rewrite: (sentence: string) => string | null
}

const DIRECTIVE_PATTERNS: Array<[RegExp, string]> = [
  [/\byou need to\b/gi, "please"],
  [/\byou must\b/gi, "please"],
  [/\bi need you to\b/gi, "please"],
]

const TONE_PATTERNS: Array<[RegExp, string]> = [
  [
    /\bYour daughter Sally has not been behaving well in my class at all\b/gi,
    "Your daughter Sally has been finding it difficult to meet expectations in my class",
  ],
  [
    /\bHer behaviour has been challenging, and I have realised that her attitude towards school has worsened considerably this term\b/gi,
    "Her behaviour has been difficult recently, and I have become concerned that her attitude towards school has worsened this term",
  ],
  [
    /\bHer behaviour has been challenging, and I was appalled by her attitude towards school last week\b/gi,
    "Her behaviour has been difficult recently, and I was concerned by her attitude towards school last week",
  ],
  [/\bI was appalled by\b/gi, "I was concerned by"],
  [
    /\bI can't make individual exceptions(?: in the moment)?(?:, as this would quickly become unmanageable across the class)?\b/gi,
    "I need to keep the same expectation in place for all students",
  ],
  [
    /\bThe marking was fair and consistent, and I applied the criteria correctly\b/gi,
    "My aim is to apply the marking criteria consistently and fairly",
  ],
  [
    /\bI do not think it is helpful to keep challenging this when the grade reflects the standard of the work\b/gi,
    "The grade reflects the standard of the work, and I am happy to clarify how the criteria were applied",
  ],
  [
    /\bI think this request is unreasonable and I cannot offer special treatment here\b/gi,
    "I understand why you are asking, and I cannot offer an individual exception here",
  ],
  [
    /\bThis request is unreasonable and I cannot offer special treatment here\b/gi,
    "I understand why you are asking, and I cannot offer an individual exception here",
  ],
  [
    /\bI am tired of repeating this and I can't keep chasing homework every week\b/gi,
    "I need to keep the expectations around homework clear and consistent each week",
  ],
  [
    /\bYour child needs to take this seriously because this is getting frustrating\b/gi,
    "Please speak with your child about this so the expectation remains clear",
  ],
  [/\bappalling\b/gi, "concerning"],
  [/\bunacceptable\b/gi, "concerning"],
  [/\bfrustrating\b/gi, "difficult"],
  [/\bunreasonable\b/gi, "difficult"],
]

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function preserveCapitalisation(source: string, replacement: string) {
  if (!source) {
    return replacement
  }

  if (source === source.toUpperCase()) {
    return replacement.toUpperCase()
  }

  if (source[0] === source[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }

  return replacement
}

function replaceFirstPattern(
  sentence: string,
  patterns: Array<[RegExp, string]>,
) {
  for (const [pattern, replacement] of patterns) {
    pattern.lastIndex = 0
    if (!pattern.test(sentence)) {
      continue
    }

    pattern.lastIndex = 0
    return sentence.replace(pattern, (match) => preserveCapitalisation(match, replacement))
  }

  return null
}

function buildClaritySuggestion(sentence: string) {
  const wordCount = countWords(sentence)
  const commaCount = (sentence.match(/,/g) ?? []).length
  const semicolonCount = (sentence.match(/;/g) ?? []).length

  if (wordCount <= 40 && semicolonCount === 0 && commaCount < 3) {
    return null
  }

  const punctuationMatch = sentence.match(/[.!?…]+$/)
  const punctuation = punctuationMatch?.[0] ?? "."
  const sentenceWithoutEnding = sentence.replace(/[.!?…]+$/, "").trim()
  const splitPatterns = [
    /;\s+/,
    /,\s+(?=(?:which|while|so|because|although)\b)/i,
    ...(wordCount > 40 ? [/\s+and\s+/i, /\s+but\s+/i] : []),
  ]

  for (const pattern of splitPatterns) {
    const match = pattern.exec(sentenceWithoutEnding)
    if (!match || match.index < 18) {
      continue
    }

    const firstPart = sentenceWithoutEnding.slice(0, match.index).trim()
    const secondPart = sentenceWithoutEnding
      .slice(match.index + match[0].length)
      .trim()

    if (!firstPart || !secondPart) {
      continue
    }

    const needsLowercaseStart = /^[A-Z]/.test(secondPart)
      ? secondPart
      : secondPart.charAt(0).toLowerCase() + secondPart.slice(1)
    return `${firstPart}${punctuation} ${needsLowercaseStart.charAt(0).toUpperCase()}${needsLowercaseStart.slice(1)}${punctuation}`
  }

  return null
}

function getBodyParagraphs(text: string) {
  const structure = formatTeacherDraftLiteralStructure(text)
  return structure.paragraphs.filter((paragraph, index, paragraphs) => {
    const trimmed = paragraph.trim()
    const firstLine = trimmed.split("\n")[0]?.trim() ?? ""
    if (!trimmed) {
      return false
    }
    if (index === 0 && /^(?:dear|hello|hi|guten tag|liebe(?:r|n)?|sehr geehrte)\b/i.test(firstLine)) {
      return false
    }
    if (index === paragraphs.length - 1 && CLOSING_REGEX.test(firstLine)) {
      return false
    }
    return true
  })
}

function extractSentences(text: string) {
  return (
    text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ??
    []
  )
}

function normalizeComparableText(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function includesComparableSentence(text: string, sentence: string) {
  const normalizedText = normalizeComparableText(text)
  const normalizedSentence = normalizeComparableText(sentence)
  if (!normalizedText || !normalizedSentence) {
    return false
  }
  return normalizedText.includes(normalizedSentence)
}

const SUGGESTION_RULES: SuggestionRule[] = [
  {
    type: "tone",
    matches: (sentence) =>
      TONE_PATTERNS.some(([pattern]) => {
        pattern.lastIndex = 0
        return pattern.test(sentence)
      }),
    rewrite: (sentence) => replaceFirstPattern(sentence, TONE_PATTERNS),
  },
  {
    type: "professional_judgement",
    matches: (sentence) =>
      DIRECTIVE_PATTERNS.some(([pattern]) => {
        pattern.lastIndex = 0
        return pattern.test(sentence)
      }),
    rewrite: (sentence) => {
      const updated = replaceFirstPattern(sentence, DIRECTIVE_PATTERNS)
      if (!updated) {
        return null
      }

      return updated.replace(/\bplease\s+([a-z])/i, (_, letter: string) => `Please ${letter.toLowerCase()}`)
    },
  },
  {
    type: "clarity",
    matches: (sentence) => Boolean(buildClaritySuggestion(sentence)),
    rewrite: (sentence) => buildClaritySuggestion(sentence),
  },
]

export function buildTeacherDraftAdvisorySuggestions(
  draftText: string,
  language: string,
  options: BuildTeacherDraftAdvisorySuggestionOptions = {},
): TeacherDraftSuggestion[] {
  const normalizedLanguage = language.trim().toLowerCase()
  const bodyText = getBodyParagraphs(draftText).join("\n\n")
  const parsedSentences = extractSentences(bodyText)
  const visibleBodyText = options.visibleDraftText
    ? getBodyParagraphs(options.visibleDraftText).join("\n\n")
    : null
  const debugInfo: TeacherDraftAdvisoryDebugInfo = {
    languageReceived: language,
    normalizedLanguage,
    languageGatePassed: normalizedLanguage.startsWith("en"),
    sentenceCount: parsedSentences.length,
    firstParsedSentences: parsedSentences.slice(0, 5),
    candidateCountBeforeVisibleFiltering: 0,
    candidateCountAfterVisibleFiltering: 0,
    filteredReasonCounts: {
      language_not_supported: 0,
      no_sentence_match: 0,
      filtered_already_resolved: 0,
      missing_visible_original: 0,
      unknown: 0,
    },
  }

  if (!debugInfo.languageGatePassed) {
    debugInfo.filteredReasonCounts.language_not_supported += 1
    if (options.debug) {
      options.onDebug?.(debugInfo)
    }
    return []
  }

  const suggestions: TeacherDraftSuggestion[] = []
  const seenOriginals = new Set<string>()

  for (const sentence of parsedSentences) {
    let matchedRule = false

    for (const rule of SUGGESTION_RULES) {
      if (!rule.matches(sentence)) {
        continue
      }

      matchedRule = true
      const suggestion = rule.rewrite(sentence)?.trim()
      if (!suggestion || suggestion === sentence || seenOriginals.has(sentence)) {
        debugInfo.filteredReasonCounts.unknown += 1
        break
      }

      debugInfo.candidateCountBeforeVisibleFiltering += 1

      if (
        visibleBodyText &&
        !includesComparableSentence(visibleBodyText, sentence)
      ) {
        if (includesComparableSentence(visibleBodyText, suggestion)) {
          debugInfo.filteredReasonCounts.filtered_already_resolved += 1
          break
        }

        debugInfo.filteredReasonCounts.missing_visible_original += 1
      }

      seenOriginals.add(sentence)
      suggestions.push({
        id: `teacher-draft-suggestion-${suggestions.length + 1}`,
        original: sentence,
        suggestion,
        type: rule.type,
      })
      debugInfo.candidateCountAfterVisibleFiltering += 1
      break
    }

    if (!matchedRule) {
      debugInfo.filteredReasonCounts.no_sentence_match += 1
    }
  }

  if (options.debug) {
    options.onDebug?.(debugInfo)
  }

  return suggestions
}
