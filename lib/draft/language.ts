import type { LanguageKey } from "@/lib/draft/fallback"

function normalizeLangInput(value?: string) {
  if (!value) {
    return null
  }
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return null
  }
  if (trimmed.startsWith("de")) {
    return "de"
  }
  if (trimmed.startsWith("en")) {
    return "en"
  }
  return null
}

export function parseLanguageCandidate(value?: string): LanguageKey | null {
  return normalizeLangInput(value)
}

export function parseAcceptLanguage(header?: string | null): LanguageKey | null {
  if (!header) {
    return null
  }
  return header
    .split(",")
    .map((segment) => segment.split(";")[0].trim())
    .map(normalizeLangInput)
    .find((lang): lang is LanguageKey => lang !== null) ?? null
}

export interface ResolveOutputLanguageOptions {
  explicit?: string
  preferred?: string
  uiLocale?: string
  acceptLanguage?: string | null
}

export function resolveOutputLanguage(options: ResolveOutputLanguageOptions): LanguageKey {
  return (
    parseLanguageCandidate(options.explicit) ??
    parseLanguageCandidate(options.preferred) ??
    parseLanguageCandidate(options.uiLocale) ??
    parseAcceptLanguage(options.acceptLanguage) ??
    "en"
  )
}
