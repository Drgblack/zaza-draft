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
