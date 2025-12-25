export type SensitivePatternType = "email" | "phone" | "address"

export interface SensitiveMatch {
  type: SensitivePatternType
  match: string
}

const PATTERNS: Array<{ type: SensitivePatternType; regex: RegExp; label: string }> = [
  {
    type: "email",
    regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    label: "email address",
  },
  {
    type: "phone",
    regex: /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,6}/,
    label: "phone number",
  },
  {
    type: "address",
    regex: /\d{1,5}\s+(?:[A-Za-z]\w*\.?\s?){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/i,
    label: "street address",
  },
]

function ensureGlobal(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  return new RegExp(pattern.source, flags)
}

/**
 * Detects email, phone, and street address patterns and provides a sanitized copy.
 */
export function detectSensitiveContent(input: string) {
  const matches: SensitiveMatch[] = []

  PATTERNS.forEach((pattern) => {
    const matcher = ensureGlobal(pattern.regex)
    let match: RegExpExecArray | null
    while ((match = matcher.exec(input))) {
      matches.push({
        type: pattern.type,
        match: match[0],
      })
    }
  })

  const sanitized = PATTERNS.reduce((acc, pattern) => {
    const replacer = ensureGlobal(pattern.regex)
    return acc.replace(replacer, `[REDACTED ${pattern.type.toUpperCase()}]`)
  }, input)

  return {
    matches,
    sanitized,
  }
}

/**
 * Blocked language rules (canonical)
 * - Do NOT include "bad" as a standalone term (false positives).
 * - Use phrase blocks for "bad kid/child/student".
 * - Includes a small set of sensitive labels that must not appear in output
 *   unless the teacher explicitly provided them (handled elsewhere in prompt logic).
 */
const BLOCKED_SINGLE_TERMS = [
  "stupid",
  "lazy",
  "dumb",
  "naughty",
  "hopeless",
  "slow",
  "weak",
  "disrespectful",
  "careless",
  "idiot",
  "incompetent",
  "failure",
  "rage",
  "hate",
  "adhd",
  "autistic",
  "depressed",
  "anxious",
  "useless",
] as const

const BLOCKED_PHRASES = ["bad kid", "bad child", "bad student"] as const

function escapeRegexLiteral(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const blockedSinglePattern = ensureGlobal(
  new RegExp(`\\b(${BLOCKED_SINGLE_TERMS.map(escapeRegexLiteral).join("|")})\\b`, "gi")
)

const blockedPhrasePattern = ensureGlobal(
  new RegExp(
    `\\b(${BLOCKED_PHRASES.map((p) => escapeRegexLiteral(p).replace(/\\s+/g, "\\\\s+")).join("|")})\\b`,
    "gi"
  )
)

export interface BlockedLanguageDetection {
  matches: string[]
  sanitized: string
}

export function detectBlockedLanguage(input: string): BlockedLanguageDetection {
  const matches: string[] = []
  blockedSinglePattern.lastIndex = 0
  blockedPhrasePattern.lastIndex = 0

  const sanitized = input
    .replace(blockedPhrasePattern, (match) => {
      matches.push(match.toLowerCase())
      return `[REDACTED TERM]`
    })
    .replace(blockedSinglePattern, (match) => {
      matches.push(match.toLowerCase())
      return `[REDACTED TERM]`
    })

  return { matches, sanitized }
}
