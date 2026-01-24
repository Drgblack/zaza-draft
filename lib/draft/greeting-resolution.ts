import { MessageType as PanicMessageType } from "@/lib/panic-scan/types"
import { isDebugEnabled } from "@/lib/debug"

export type NameConfidenceLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH"

export interface SafeNameScore {
  level: NameConfidenceLevel
  score: number
}

export type GreetingLocale = "de" | "en"

const SIGNOFFS: Record<GreetingLocale, RegExp[]> = {
  de: [
    /mit freundlichen grüßen/i,
    /freundliche grüße/i,
    /viele grüße/i,
    /beste grüße/i,
    /hochachtungsvoll/i,
  ],
  en: [
    /kind regards/i,
    /best regards/i,
    /regards/i,
    /sincerely/i,
    /yours sincerely/i,
    /yours faithfully/i,
  ],
}

const UI_CHROME_KEYWORDS = [
  "open in gmail",
  "translate",
  "inbox",
  "compose",
  "gmaill",
  "gmail",
  "sent",
  "drafts",
  "support",
  "summarise",
  "facebook",
  "meet",
]

const ROLE_KEYWORDS_EN = ["School Office", "Administration", "Support", "Customer Service"]
const ROLE_KEYWORDS_DE = ["Sekretariat", "Schulleitung", "Verwaltung", "Support", "Kundenservice"]

const HONORIFICS = ["Herr", "Frau", "Mr", "Mrs", "Ms", "Dr", "Prof", "Professor"]

const TITLE_TOKENS = ["Dr", "Dr.", "Prof", "Prof.", "Professor"]

const MESSAGE_TYPE_TREE_MAPPING: Record<PanicMessageType | string, string> = {
  parent_complaint: "formal_complaint",
  urgent_request: "formal_complaint",
  official_notice: "formal_complaint",
  student_concern: "parent_message",
}

function normalizeText(text: string) {
  return text.replace(/\r\n?/g, "\n").trim()
}

function splitLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function looksLikeUiChrome(candidate: string) {
  const lower = candidate.toLowerCase()
  return UI_CHROME_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function cleanCandidate(value: string) {
  return value.trim().replace(/^[^A-Za-zÄÖÜäöüßÉÈéèĆć]+|[^A-Za-zÄÖÜäöüßÉÈéèĆć]+$/g, "").replace(/\s+/g, " ")
}

export function extractSignatureName(cleanedText: string, locale: GreetingLocale): string | null {
  const normalized = normalizeText(cleanedText)
  const lines = splitLines(normalized)
  const signoffs = SIGNOFFS[locale]

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]
    if (signoffs.some((pattern) => pattern.test(line))) {
      for (let offset = 1; offset <= 2; offset += 1) {
        const candidateLine = lines[i + offset]
        if (candidateLine) {
          const cleaned = cleanCandidate(candidateLine)
          if (cleaned) {
            return cleaned
          }
        }
      }
      break
    }
  }

  if (lines.length) {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = cleanCandidate(lines[i])
      if (!line) {
        continue
      }
      if (looksLikeUiChrome(line)) {
        continue
      }
      if (line.includes(":")) {
        continue
      }
      return line
    }
  }

  return null
}

export function scoreSafeName(candidate: string, locale: GreetingLocale): SafeNameScore {
  const cleaned = cleanCandidate(candidate)
  if (!cleaned) {
    return { level: "NONE", score: 0 }
  }
  if (/-@|https?:\/\//i.test(cleaned) || cleaned.includes("www.") || /[0-9]/.test(cleaned)) {
    return { level: "NONE", score: 0 }
  }
  if (looksLikeUiChrome(cleaned)) {
    return { level: "NONE", score: 0 }
  }
  const roles = locale === "de" ? ROLE_KEYWORDS_DE : ROLE_KEYWORDS_EN
  if (roles.some((role) => cleaned.toLowerCase().includes(role.toLowerCase()))) {
    return { level: "NONE", score: 0 }
  }
  const tokens = cleaned.split(/\s+/)
  if (tokens.length < 2 || tokens.length > 4) {
    return { level: "NONE", score: 0 }
  }
  if (tokens.every((token) => HONORIFICS.includes(token.replace(/\.$/, "")))) {
    return { level: "NONE", score: 0 }
  }

  let score = 0

  const titleMatch = tokens.some((token) => TITLE_TOKENS.includes(token.replace(/\.$/, "")))
  const capitalizedTokens = tokens.filter((token) => /^[A-ZÄÖÜ][\p{L}'’-]+$/u.test(token))

  if (capitalizedTokens.length >= 2) {
    score += 3
  }
  if (titleMatch && capitalizedTokens.length >= 1) {
    score += 2
  }
  if (/^[A-ZÄÖÜ][\p{L}'’-]+ [A-ZÄÖÜ][\p{L}'’-]+$/u.test(cleaned)) {
    score += 2
  }

  if (cleaned.includes(",") && !cleaned.endsWith(",")) {
    score -= 2
  }
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 4) {
    score -= 2
  }
  if (tokens.length > 4) {
    score -= 3
  }

  if (score >= 5) {
    return { level: "HIGH", score }
  }
  if (score >= 3) {
    return { level: "MEDIUM", score }
  }
  if (score >= 1) {
    return { level: "LOW", score }
  }
  return { level: "NONE", score }
}

export function greetingWithName(locale: GreetingLocale, fullName: string): string {
  const cleaned = cleanCandidate(fullName)
  if (locale === "de") {
    return `Guten Tag, ${cleaned},`
  }
  return `Hello ${cleaned},`
}

function fallbackGreeting(locale: GreetingLocale, messageType?: string): string {
  if (locale === "de") {
    if (messageType === "formal_complaint") {
      return "Sehr geehrte Damen und Herren,"
    }
    if (messageType === "parent_message") {
      return "Liebe Eltern,"
    }
    return "Liebe Erziehungsberechtigte,"
  }
  if (messageType === "parent_message") {
    return "Dear Parent / Carer,"
  }
  return "Hello,"
}

export type GreetingSource = "resolved-name" | "generic-fallback"

export interface GreetingResult {
  greeting: string
  safeName?: string
  confidence: NameConfidenceLevel
  source: GreetingSource
}

export interface GreetingDecision {
  greeting: string
  source: GreetingSource
  safeParentName: string | null
  confidence: NameConfidenceLevel
  locale: GreetingLocale
  messageType?: string
  scanId?: string
  greetingFinal?: boolean
}

export interface ResolveGreetingArgs {
  cleanedOcrText: string
  locale: GreetingLocale
  messageType?: string
  recipientOverride?: string | null
}

export function resolveGreeting(args: ResolveGreetingArgs): GreetingResult {
  const locale = args.locale === "de" ? "de" : "en"
  const override = args.recipientOverride?.trim()
  const messageType = MESSAGE_TYPE_TREE_MAPPING[args.messageType ?? ""] ?? args.messageType

  if (override) {
    const overrideScore = scoreSafeName(override, locale)
    if (overrideScore.level === "HIGH" || overrideScore.level === "MEDIUM") {
      return {
        greeting: greetingWithName(locale, override),
        safeName: override,
        confidence: overrideScore.level,
        source: "resolved-name",
      }
    }
  }

  const signatureName = extractSignatureName(args.cleanedOcrText, locale)
  if (signatureName) {
    const signatureScore = scoreSafeName(signatureName, locale)
    if (signatureScore.level === "HIGH" || signatureScore.level === "MEDIUM") {
      return {
        greeting: greetingWithName(locale, signatureName),
        safeName: signatureName,
        confidence: signatureScore.level,
        source: "resolved-name",
      }
    }
  }

  return {
    greeting: fallbackGreeting(locale, messageType),
    confidence: "NONE",
    source: "generic-fallback",
  }
}

export function logGreetingDecision(
  stage: string,
  decision: GreetingDecision,
  searchParams?: URLSearchParams | null,
): void {
  if (!isDebugEnabled(searchParams)) {
    return
  }

  console.debug(
    JSON.stringify({
      stage,
      ...decision,
    }),
  )
}
