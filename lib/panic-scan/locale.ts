import { parseAcceptLanguage, parseLanguageCandidate } from "@/lib/draft/language"
import type { LanguageKey } from "@/lib/draft/fallback"

export type PanicScanLocaleResolutionSource =
  | "ui_locale"
  | "explicit_language"
  | "source_text"
  | "accept_language"
  | "default"

export interface PanicScanLocaleResolutionInput {
  uiLocale?: string | null
  explicitLanguage?: string | null
  sourceText?: string | null
  acceptLanguage?: string | null
}

export interface PanicScanLocaleResolution {
  language: LanguageKey
  source: PanicScanLocaleResolutionSource
}

const GERMAN_HINTS = [
  /\b(und|nicht|mit|eine|einen|dass|heute|bitte|hausaufgaben|unterricht|eltern|klasse|liebe|guten)\b/gi,
  /[äöüß]/gi,
]

const ENGLISH_HINTS = [
  /\b(the|and|not|with|because|today|please|homework|parent|child|class|lesson|dear|hello|thank|school|upset)\b/gi,
]

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length ?? 0), 0)
}

export function inferPanicScanLanguageFromSourceText(sourceText?: string | null): LanguageKey | null {
  const normalized = (sourceText ?? "").trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const germanScore = countMatches(normalized, GERMAN_HINTS)
  const englishScore = countMatches(normalized, ENGLISH_HINTS)

  if (germanScore >= 2 && germanScore > englishScore) {
    return "de"
  }
  if (englishScore >= 2 && englishScore >= germanScore) {
    return "en"
  }
  return null
}

export function resolvePanicScanLocale(
  input: PanicScanLocaleResolutionInput,
): PanicScanLocaleResolution {
  // Priority rule for Panic Scan analysis:
  // 1. An explicit UI locale always wins.
  // 2. If there is no explicit UI locale, use an explicit language code if one was provided.
  // 3. If neither exists, infer from the OCR/source text.
  // 4. Only then look at Accept-Language.
  // 5. Default to English; never silently fall back to German without an explicit or textual signal.
  const uiLocale = parseLanguageCandidate(input.uiLocale ?? undefined)
  if (uiLocale) {
    return { language: uiLocale, source: "ui_locale" }
  }

  const explicitLanguage = parseLanguageCandidate(input.explicitLanguage ?? undefined)
  if (explicitLanguage) {
    return { language: explicitLanguage, source: "explicit_language" }
  }

  const inferred = inferPanicScanLanguageFromSourceText(input.sourceText)
  if (inferred) {
    return { language: inferred, source: "source_text" }
  }

  const acceptLanguage = parseAcceptLanguage(input.acceptLanguage ?? null)
  if (acceptLanguage) {
    return { language: acceptLanguage, source: "accept_language" }
  }

  return { language: "en", source: "default" }
}
