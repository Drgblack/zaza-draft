import type { DeescalationCategory, DeescalationSeverity, DetectionResult, FlaggedPhrase } from "./types"

const severityOrder: DeescalationSeverity[] = ["low", "medium", "high"]

const NEGATIVE_JUDGEMENT_TERMS = [
  "lie",
  "lying",
  "lied",
  "rude",
  "lazy",
  "disruptive",
  "argue",
  "argues",
  "arguing",
  "argumentative",
  "listens",
  "defiant",
  "difficult",
  "misbehaving",
  "lüge",
  "lügen",
  "dumm",
  "idiot",
  "faul",
  "schwach",
  "langsam",
]

const TIME_BOUND_PHRASES = [
  "this week",
  "this month",
  "this term",
  "this year",
  "last week",
  "last month",
  "recently",
  "today",
  "this morning",
  "this afternoon",
  "this evening",
  "in the last",
  "over the past",
  "since",
]

function shouldFlagAbsolute(match: RegExpMatchArray, text: string) {
  const snippet = match[0]?.toLowerCase().trim()
  if (!snippet || (snippet !== "always" && snippet !== "never")) {
    return true
  }

  const index = match.index ?? 0
  const length = snippet.length
  const windowStart = Math.max(0, index - 80)
  const windowEnd = Math.min(text.length, index + length + 80)
  const context = text.slice(windowStart, windowEnd).toLowerCase()

  const hasTimeBound = TIME_BOUND_PHRASES.some((phrase) => context.includes(phrase))
  if (hasTimeBound) {
    return false
  }

  return NEGATIVE_JUDGEMENT_TERMS.some((term) => context.includes(term))
}

const CATEGORY_RULES: {
  category: DeescalationCategory
  severity: DeescalationSeverity
  patterns: RegExp[]
}[] = [
  {
    category: "threat",
    severity: "high",
    patterns: [
      /or else\b/gi,
      /\bif you (?:do not|don't|will not|won't)\b/gi,
      /\bI will (?:not )?tolerate\b/gi,
      /\bI'll (?:not )?tolerate\b/gi,
      /\boder sonst\b/gi,
      /\bwenn (?:du|ihr|Sie) (?:nicht|nichts?)\b/gi,
    ],
  },
  {
    category: "insult",
    severity: "medium",
    patterns: [
      /\bliar(?:s)?\b/gi,
      /\blie(?:s|ing)?\b/gi,
      /\bstupid\b/gi,
      /\bidiot(?:ic)?\b/gi,
      /\bworthless\b/gi,
      /\bdumm(?:e|er|en)?\b/gi,
      /\bidiot(?:in|isch)?\b/gi,
      /\bfaul(?:es|e|er)?\b/gi,
      /\bschwach\b/gi,
      /\blangsam\b/gi,
    ],
  },
  {
    category: "inflammatory",
    severity: "medium",
    patterns: [
      /\blazy(?: attitude)?\b/gi,
      /\bmanipulative\b/gi,
      /\bpsycho\b/gi,
      /\bmanipulating\b/gi,
      /\bmanipulierend\b/gi,
      /\bmanipulativ\b/gi,
    ],
  },
  {
    category: "sarcasm",
    severity: "low",
    patterns: [
      /\byeah right\b/gi,
      /\bas if\b/gi,
      /\b(yeah|sure|right|whatever) (?:right|whatever|sure)\b/gi,
      /\bja klar\b/gi,
      /\bals ob\b/gi,
    ],
  },
  {
    category: "absolute",
    severity: "low",
    patterns: [
      /\balways\b/gi,
      /\bnever\b/gi,
      /\bevery time\b/gi,
      /\bconstantly\b/gi,
      /\bat all times\b/gi,
      /\bimmer\b/gi,
      /\bnie\b/gi,
      /\bständig\b/gi,
      /\bjederzeit\b/gi,
    ],
  },
  {
    category: "profanity",
    severity: "medium",
    patterns: [
      /\bdamn\b/gi,
      /\bshit\b/gi,
      /\bhell\b/gi,
      /\bbitch\b/gi,
      /\b(piss|pissed)\b/gi,
      /\bverdammt\b/gi,
      /\bscheiße\b/gi,
      /\bscheiß\b/gi,
      /\bmist\b/gi,
      /\barschloch\b/gi,
      /\bverflucht\b/gi,
      /\bkacke\b/gi,
    ],
  },
]

export function detectHighEmotionPhrases(text: string): DetectionResult {
  const flagged: FlaggedPhrase[] = []
  const seen = new Set<string>()
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      for (const match of text.matchAll(pattern)) {
        const snippet = match[0]?.trim()
        if (!snippet) {
          continue
        }
        if (rule.category === "absolute" && !shouldFlagAbsolute(match, text)) {
          continue
        }
        const key = `${rule.category}|${snippet.toLowerCase()}`
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        flagged.push({
          snippet,
          category: rule.category,
          severity: rule.severity,
        })
      }
    }
  }

  const maxSeverity =
    flagged.reduce<DeescalationSeverity | null>((current, item) => {
      if (!current) {
        return item.severity
      }
      return severityOrder.indexOf(item.severity) > severityOrder.indexOf(current)
        ? item.severity
        : current
    }, null) ?? "low"

  const wasDeescalated = flagged.some((item) => severityOrder.indexOf(item.severity) >= severityOrder.indexOf("medium"))

  return {
    flaggedPhrases: flagged,
    maxSeverity,
    wasDeescalated,
  }
}
