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

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isDateLikeValue(value: string) {
  const trimmed = value.trim()
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
    /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(trimmed)
  )
}

function shouldIgnoreSensitiveMatch(type: SensitivePatternType, match: string) {
  return type === "phone" && isDateLikeValue(match)
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
      if (shouldIgnoreSensitiveMatch(pattern.type, match[0])) {
        continue
      }
      matches.push({
        type: pattern.type,
        match: match[0],
      })
    }
  })

  const sanitized = PATTERNS.reduce((acc, pattern) => {
    const replacer = ensureGlobal(pattern.regex)
    return acc.replace(replacer, (value) =>
      shouldIgnoreSensitiveMatch(pattern.type, value)
        ? value
        : `[REDACTED ${pattern.type.toUpperCase()}]`,
    )
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
export type BlockedLanguageTier = "tier1" | "tier2" | "tier3"

const TIER1_TERMS = [
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
  "useless",
  "rage",
] as const

const TIER1_PHRASES = ["bad kid", "bad child", "bad student"] as const

const TIER2_TERMS = [
  "adhd",
  "autistic",
  "autism",
  "depressed",
  "anxious",
] as const

const TIER3_TERMS = [
  "hate",
  "killing",
  "kill",
  "murder",
  "terror",
  "slur",
] as const

function builtPatternFromTerms(terms: readonly string[]) {
  const escaped = terms.map((term) =>
    term
      .trim()
      .split(/\s+/)
      .map((part) => escapeRegexLiteral(part))
      .join("\\s+")
  )
  return ensureGlobal(new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"))
}

const tier1Pattern = builtPatternFromTerms([...TIER1_TERMS, ...TIER1_PHRASES])
const tier2Pattern = builtPatternFromTerms(TIER2_TERMS)
const tier3Pattern = builtPatternFromTerms(TIER3_TERMS)
const ALL_TIERED_PATTERNS = [tier3Pattern, tier2Pattern, tier1Pattern]

export interface BlockedLanguageDetection {
  detected: boolean
  tier: BlockedLanguageTier | null
  matches: string[]
  redactedPreview: string
}

export function detectBlockedLanguage(input: string): BlockedLanguageDetection {
  const matches: string[] = []
  let highestTier: BlockedLanguageTier | null = null

  const tierPatterns: Array<{ tier: BlockedLanguageTier; pattern: RegExp }> = [
    { tier: "tier3", pattern: tier3Pattern },
    { tier: "tier2", pattern: tier2Pattern },
    { tier: "tier1", pattern: tier1Pattern },
  ]

  tierPatterns.forEach(({ tier, pattern }) => {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(input))) {
      matches.push(match[0])
      if (!highestTier) {
        highestTier = tier
      }
    }
  })

  const sanitized = ALL_TIERED_PATTERNS.reduce((acc, pattern) => {
    pattern.lastIndex = 0
    return acc.replace(pattern, () => `[REDACTED TERM]`)
  }, input)

  return {
    detected: matches.length > 0,
    tier: highestTier,
    matches,
    redactedPreview: sanitized,
  }
}

export interface ReframeResult {
  text: string
  applied: boolean
}

interface ReframeRule {
  pattern: string
  replacement: string
}

const TIER1_REFRAME_RULES: ReframeRule[] = [
  { pattern: "\\bstupid\\b", replacement: "finding the topic challenging right now" },
  { pattern: "\\bdumb\\b", replacement: "finding the topic challenging right now" },
  { pattern: "\\blazy\\b", replacement: "not yet consistently completing tasks and may need encouragement" },
  { pattern: "\\bnaughty\\b", replacement: "finding it difficult to follow classroom expectations" },
  { pattern: "\\bhopeless\\b", replacement: "needing steady encouragement to stay motivated" },
  { pattern: "\\bslow\\b", replacement: "still building fluency in the concept" },
  { pattern: "\\bweak\\b", replacement: "working on strengthening that skill" },
  { pattern: "\\bdisrespectful\\b", replacement: "finding it challenging to meet behaviour expectations" },
  { pattern: "\\bcareless\\b", replacement: "benefiting from reminders about attention to detail" },
  { pattern: "\\bidiot\\b", replacement: "struggling with confidence in this area" },
  { pattern: "\\bincompetent\\b", replacement: "still developing mastery of the skill" },
  { pattern: "\\bfailure\\b", replacement: "working through setbacks constructively" },
  { pattern: "\\buseless\\b", replacement: "needs encouragement to see their strengths" },
  { pattern: "\\brage\\b", replacement: "experiencing strong emotions and needs support to regulate" },
  { pattern: "\\bbad\\s+kid\\b|\\bbad\\s+child\\b|\\bbad\\s+student\\b", replacement: "needs support to meet expectations" },
]

const TIER2_REFRAME_RULES: ReframeRule[] = [
  {
    pattern: "\\badhd\\b",
    replacement: "may benefit from structured routines, chunked instructions, and movement breaks",
  },
  {
    pattern: "\\bautistic\\b|\\bautism\\b",
    replacement: "may benefit from clear expectations, predictable routines, and sensory-aware supports",
  },
  {
    pattern: "\\bdepressed\\b",
    replacement: "may respond well to additional emotional support and positive momentum",
  },
  {
    pattern: "\\banxious\\b",
    replacement: "may benefit from calm, predictable routines and check-ins",
  },
]

function applyReframeRules(text: string, rules: ReframeRule[]) {
  let applied = false
  const nextText = rules.reduce((acc, { pattern, replacement }) => {
    const regex = ensureGlobal(new RegExp(pattern, "gi"))
    let matchFound = false
    const replaced = acc.replace(regex, () => {
      matchFound = true
      return replacement
    })
    if (matchFound) {
      applied = true
    }
    return replaced
  }, text)
  return { text: nextText, applied }
}

export function reframeBlockedLanguage(text: string, tier: BlockedLanguageTier | null): ReframeResult {
  if (!tier) {
    return { text, applied: false }
  }

  const rules = tier === "tier1" ? TIER1_REFRAME_RULES : tier === "tier2" ? TIER2_REFRAME_RULES : []
  return applyReframeRules(text, rules)
}
