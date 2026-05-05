import { CLOSING_REGEX } from "@/lib/draft/format"
import { formatTeacherDraftLiteralStructure } from "@/lib/draft/teacher-draft-structure"

export type TeacherDraftSuggestionType = "tone" | "clarity" | "professional_judgement"

export interface TeacherDraftSuggestion {
  id: string
  original: string
  suggestion: string
  type: TeacherDraftSuggestionType
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
  if (countWords(sentence) <= 40 && (sentence.match(/[;,]/g) ?? []).length < 2) {
    return null
  }

  const punctuationMatch = sentence.match(/[.!?…]+$/)
  const punctuation = punctuationMatch?.[0] ?? "."
  const sentenceWithoutEnding = sentence.replace(/[.!?…]+$/, "").trim()
  const splitPatterns = [/\s+and\s+/i, /\s+but\s+/i, /;\s+/, /,\s+(?=(?:which|while|so|because|although)\b)/i]

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
): TeacherDraftSuggestion[] {
  if (language !== "en") {
    return []
  }

  const suggestions: TeacherDraftSuggestion[] = []
  const seenOriginals = new Set<string>()
  const bodyText = getBodyParagraphs(draftText).join("\n\n")

  for (const sentence of extractSentences(bodyText)) {
    for (const rule of SUGGESTION_RULES) {
      if (!rule.matches(sentence)) {
        continue
      }

      const suggestion = rule.rewrite(sentence)?.trim()
      if (!suggestion || suggestion === sentence || seenOriginals.has(sentence)) {
        break
      }

      seenOriginals.add(sentence)
      suggestions.push({
        id: `teacher-draft-suggestion-${suggestions.length + 1}`,
        original: sentence,
        suggestion,
        type: rule.type,
      })
      break
    }
  }

  return suggestions
}
