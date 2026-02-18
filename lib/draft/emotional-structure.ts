type Locale = "en" | "de"

export interface EmotionalStructureResult {
  locale: Locale
  score: number
  passed: boolean
  signals: string[]
}

const SIGNALS: Record<Locale, Array<{ name: string; patterns: RegExp[] }>> = {
  en: [
    { name: "appreciation", patterns: [/thank(s| you)/i, /\bappreciate\b/i] },
    { name: "empathy", patterns: [/\bunderstand\b/i, /\bhear you\b/i, /\boverwhelm/i] },
    {
      name: "commitment",
      patterns: [/\bwill\b/i, /\bplan\b/i, /\bset up\b/i, /\bcheck(ing)? in\b/i],
    },
    { name: "invitation", patterns: [/\breach out\b/i, /\blet me know\b/i, /\bfeel free\b/i] },
    { name: "closing", patterns: [/\bkind regards\b/i, /\bbest\b/i, /\bsincerely\b/i] },
  ],
  de: [
    { name: "appreciation", patterns: [/\bdanke\b/i, /\bherzlichen dank\b/i] },
    { name: "empathy", patterns: [/\bverstehe\b/i, /\bbelastend\b/i, /\bfokus\b/i] },
    {
      name: "commitment",
      patterns: [/\bplane(n)?\b/i, /\bkurze termine\b/i, /\bbin.*da\b/i],
    },
    { name: "invitation", patterns: [/\bmelde(n)? sie\b/i, /\bfragen haben\b/i, /\bgern\b/i] },
    { name: "closing", patterns: [/\bmit freundlichen grüßen\b/i, /\bfreundlichen gr\b/i] },
  ],
}

function countSignals(text: string, locale: Locale) {
  const buckets = SIGNALS[locale]
  const hits: string[] = []
  for (const bucket of buckets) {
    if (bucket.patterns.some((pattern) => pattern.test(text))) {
      hits.push(bucket.name)
    }
  }
  return hits
}

export function evaluateEmotionalStructure(text: string, locale: Locale = "en"): EmotionalStructureResult {
  const normalizedLocale: Locale = locale === "de" ? "de" : "en"
  const signals = countSignals(text, normalizedLocale)
  const score = signals.length
  const passed = score >= 4

  return {
    locale: normalizedLocale,
    score,
    passed,
    signals,
  }
}
