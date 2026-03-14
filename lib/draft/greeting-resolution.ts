import { MessageType as PanicMessageType } from "@/lib/panic-scan/types"
import { isDebugEnabled } from "@/lib/debug"
import type { DraftMode, DraftTone } from "@/lib/types"
import type { MessageDirection } from "@/lib/generation/classification"

export type NameConfidenceLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH"

export interface SafeNameScore {
  level: NameConfidenceLevel
  score: number
}

export type GreetingLocale = "de" | "en"
type GreetingFormality = "standard" | "formal"

const PARENT_FACING_DIRECTIONS: MessageDirection[] = [
  "parent_to_teacher",
  "teacher_to_parent",
  "teacher_internal_notes",
]

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

const ENGLISH_HONORIFICS = new Map([
  ["mr", "Mr"],
  ["mr.", "Mr"],
  ["mrs", "Mrs"],
  ["mrs.", "Mrs"],
  ["ms", "Ms"],
  ["ms.", "Ms"],
  ["miss", "Miss"],
  ["mx", "Mx"],
  ["mx.", "Mx"],
])

const GERMAN_HONORIFICS = new Map([
  ["herr", "Herr"],
  ["frau", "Frau"],
])

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

function isParentFacingMode(mode?: DraftMode, direction?: MessageDirection) {
  return mode === "parent_message" && (!direction || PARENT_FACING_DIRECTIONS.includes(direction))
}

function normalizeMessageType(messageType?: string) {
  if (!messageType) {
    return undefined
  }
  return MESSAGE_TYPE_TREE_MAPPING[messageType] ?? messageType
}

function resolveGreetingFormality(
  locale: GreetingLocale,
  tone?: DraftTone,
  messageType?: string,
) {
  const normalizedMessageType = normalizeMessageType(messageType)
  if (normalizedMessageType === "formal_complaint") {
    return "formal" satisfies GreetingFormality
  }
  if (locale === "de" && tone === "direct") {
    return "formal" satisfies GreetingFormality
  }
  return "standard" satisfies GreetingFormality
}

interface ParsedName {
  cleaned: string
  firstName: string | null
  lastName: string | null
  honorific: string | null
  academicTitles: string[]
  displayName: string
  salutationConfidence: NameConfidenceLevel
}

function parseNameParts(fullName: string): ParsedName {
  const cleaned = cleanCandidate(fullName)
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  if (!tokens.length) {
    return {
      cleaned,
      firstName: null,
      lastName: null,
      honorific: null,
      academicTitles: [],
      displayName: "",
      salutationConfidence: "NONE",
    }
  }

  let cursor = 0
  let honorific: string | null = null
  const firstToken = tokens[cursor]?.toLowerCase()
  if (firstToken && (ENGLISH_HONORIFICS.has(firstToken) || GERMAN_HONORIFICS.has(firstToken))) {
    honorific = tokens[cursor].replace(/\.\s*$/, "")
    cursor += 1
  }

  const academicTitles: string[] = []
  while (cursor < tokens.length && TITLE_TOKENS.includes(tokens[cursor].replace(/\.\s*$/, ""))) {
    const title = tokens[cursor].replace(/\.\s*$/, "")
    academicTitles.push(title === "Dr" ? "Dr." : title)
    cursor += 1
  }

  const nameTokens = tokens.slice(cursor)
  const firstName = nameTokens[0] ?? null
  const lastName = nameTokens.length >= 2 ? nameTokens[nameTokens.length - 1] : firstName
  const displayName = [...academicTitles, ...nameTokens].join(" ").trim()

  let salutationConfidence: NameConfidenceLevel = "LOW"
  if (honorific && lastName) {
    salutationConfidence = "HIGH"
  } else if (academicTitles.length && lastName) {
    salutationConfidence = "MEDIUM"
  } else if (nameTokens.length >= 2) {
    salutationConfidence = "MEDIUM"
  } else if (!nameTokens.length) {
    salutationConfidence = "NONE"
  }

  return {
    cleaned,
    firstName,
    lastName,
    honorific,
    academicTitles,
    displayName,
    salutationConfidence,
  }
}

interface GreetingPolicyInput {
  locale: GreetingLocale
  mode?: DraftMode
  direction?: MessageDirection
  tone?: DraftTone
  messageType?: string
  allowEnglishFullName?: boolean
}

function buildNamedGreeting(fullName: string, input: GreetingPolicyInput): string {
  const parsed = parseNameParts(fullName)
  const formality = resolveGreetingFormality(input.locale, input.tone, input.messageType)

  if (!parsed.displayName && !parsed.firstName) {
    return buildFallbackGreeting(input)
  }

  if (input.locale === "en") {
    const englishHonorific = parsed.honorific
      ? ENGLISH_HONORIFICS.get(parsed.honorific.toLowerCase())
      : null
    if (englishHonorific && parsed.lastName && formality === "formal") {
      return `Dear ${englishHonorific} ${parsed.lastName},`
    }
    if (parsed.academicTitles.length && parsed.displayName) {
      return `Hello ${parsed.displayName},`
    }
    if (parsed.firstName) {
      return `Hello ${parsed.firstName},`
    }
    if (input.allowEnglishFullName && parsed.displayName) {
      return `Hello ${parsed.displayName},`
    }
    return buildFallbackGreeting(input)
  }

  const germanHonorific = parsed.honorific
    ? GERMAN_HONORIFICS.get(parsed.honorific.toLowerCase())
    : null
  if (germanHonorific && parsed.lastName && parsed.salutationConfidence === "HIGH") {
    if (formality === "formal") {
      const prefix = germanHonorific === "Herr" ? "Sehr geehrter Herr" : "Sehr geehrte Frau"
      return `${prefix} ${parsed.lastName},`
    }
    return `Hallo ${germanHonorific} ${parsed.lastName},`
  }
  if (parsed.displayName) {
    return `Guten Tag, ${parsed.displayName},`
  }
  return "Guten Tag,"
}

function buildFallbackGreeting(input: GreetingPolicyInput): string {
  if (!isParentFacingMode(input.mode, input.direction)) {
    return ""
  }

  if (input.locale === "de") {
    return "Guten Tag,"
  }
  return "Dear Parent/Carer,"
}

export function normalizeParentFacingGreetingLine(value: string, locale: GreetingLocale): string {
  const collapsed = normalizeText(value)
    .replace(/\s+,/g, ",")
    .replace(/\s+([;:.!?])/g, "$1")
    .replace(/,+/g, ",")
    .trim()

  if (!collapsed) {
    return locale === "de" ? "Guten Tag," : "Dear Parent/Carer,"
  }

  if (locale === "en") {
    if (/^(hello|hi|dear)\s*,?$/i.test(collapsed)) {
      return "Dear Parent/Carer,"
    }
    if (/^dear\s+parent(?:\/carer|\(s\))?\s*,?$/i.test(collapsed)) {
      return "Dear Parent/Carer,"
    }
    if (/^(hello|hi)\s+.+$/i.test(collapsed)) {
      return `${collapsed.replace(/,+$/, "")},`
    }
    if (/^dear\s+.+$/i.test(collapsed)) {
      return `${collapsed.replace(/,+$/, "")},`
    }
  }

  if (locale === "de") {
    if (/^(guten tag|hallo)\s*,?$/i.test(collapsed)) {
      return "Guten Tag,"
    }
    if (/^(guten tag|hallo|sehr geehrte|sehr geehrter)\b/i.test(collapsed)) {
      return `${collapsed.replace(/,+$/, "")},`
    }
  }

  return collapsed
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

export function greetingWithName(
  locale: GreetingLocale,
  fullName: string,
  input: Omit<GreetingPolicyInput, "locale"> = {},
): string {
  return buildNamedGreeting(fullName, { ...input, locale })
}

export type GreetingSource = "resolved-name" | "generic-fallback"

export interface GreetingResult {
  greeting: string
  safeName?: string
  confidence: NameConfidenceLevel
  source: GreetingSource
  final: boolean
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
  mode?: DraftMode
  direction?: MessageDirection
  tone?: DraftTone
  allowEnglishFullName?: boolean
}

export function resolveGreeting(args: ResolveGreetingArgs): GreetingResult {
  const locale = args.locale === "de" ? "de" : "en"
  const override = args.recipientOverride?.trim()
  const messageType = normalizeMessageType(args.messageType)
  const policyInput: GreetingPolicyInput = {
    locale,
    mode: args.mode,
    direction: args.direction,
    tone: args.tone,
    messageType,
    allowEnglishFullName: args.allowEnglishFullName,
  }

  if (!isParentFacingMode(args.mode, args.direction)) {
    return {
      greeting: "",
      confidence: "NONE",
      source: "generic-fallback",
      final: false,
    }
  }

  if (override) {
    const overrideScore = scoreSafeName(override, locale)
    if (overrideScore.level === "HIGH" || overrideScore.level === "MEDIUM") {
      return {
        greeting: normalizeParentFacingGreetingLine(greetingWithName(locale, override, policyInput), locale),
        safeName: override,
        confidence: overrideScore.level,
        source: "resolved-name",
        final: true,
      }
    }
  }

  const signatureName = extractSignatureName(args.cleanedOcrText, locale)
  if (signatureName) {
    const signatureScore = scoreSafeName(signatureName, locale)
    if (signatureScore.level === "HIGH" || signatureScore.level === "MEDIUM") {
      return {
        greeting: normalizeParentFacingGreetingLine(
          greetingWithName(locale, signatureName, policyInput),
          locale,
        ),
        safeName: signatureName,
        confidence: signatureScore.level,
        source: "resolved-name",
        final: true,
      }
    }
  }

  return {
    greeting: normalizeParentFacingGreetingLine(buildFallbackGreeting(policyInput), locale),
    confidence: "NONE",
    source: "generic-fallback",
    final: true,
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
