const UI_LINE_PATTERNS: RegExp[] = [
  /^\s*(?:\|\|\||III|I{1,5}|l{1,5}|››|»»|<<|>>|\.{3,}|···|───)\s*$/i,
  /^\s*\d+\+\s*$/i,
  /^\s*99\+\s*$/i,
  /^\s*[|!\\\/\-]{2,}\s*$/i,
  /^\s*\d+\s+of\s+\d[\d,]*\s*$/i,
]

const MENU_KEYWORDS = new Set([
  "gmail",
  "mail",
  "search",
  "compose",
  "inbox",
  "starred",
  "snoozed",
  "sent",
  "drafts",
  "meet",
  "chat",
  "labels",
  "more",
  "summarise",
  "this",
  "email",
  "upgrade",
  "reply",
  "forward",
  "share",
  "in",
  "translate",
  "to",
  "english",
  "open",
  "google",
  "sans",
  "serif",
  "toolbar",
  "menu",
  "icons",
  "settings",
])

const GREETING_REGEX = /^(?:dear|hi|hello|hey|guten\s+tag|hallo|liebe[rn]?|sehr\s+geehrte[rn]?|sehr\s+geehrter|frau|herr)\b/i
const SIGNATURE_REGEX = /^(?:kind regards|regards|best regards|sincerely|yours sincerely|thanks|thank you),?$/i
const SIGNOFF_REGEX = /^(?:kind regards|regards|best regards|sincerely|yours sincerely|yours faithfully|mit freundlichen grüßen|freundliche grüße|viele grüße|beste grüße|hochachtungsvoll)\b/i
const SIGNATURE_NAME_REGEX = /^(?:mr|mrs|ms|miss|dr)\b.*$/i

const UI_LINE_KEYWORDS = [
  "sans serif",
  "search mail",
  "compose",
  "drafts",
  "meet",
  "chat",
  "inbox",
  "toolbar",
  "toolbar buttons",
  "read/write",
  "summarise this email",
  "summarize this email",
  "translation",
  "translate",
  "open in gmail",
  "search",
  "gmail",
  "labels",
  "more",
  "starred",
  "assistant",
  "sans",
  "serif",
]

function containsUiNoise(line: string) {
  const lower = line.toLowerCase()
  if (UI_LINE_KEYWORDS.some((phrase) => lower.includes(phrase))) {
    return true
  }
  if (/^(?:sans serif|search mail|compose|inbox|drafts|meet|chat|toolbar)$/i.test(line)) {
    return true
  }
  return false
}

function normalizeLine(raw: string) {
  return raw.replace(/\s+/g, " ").trim()
}

function isMenuFragment(line: string) {
  const normalized = line
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (normalized.length === 0 || normalized.length > 3) {
    return false
  }
  return normalized.every((word) => MENU_KEYWORDS.has(word))
}

function isGreetingOrSignature(line: string) {
  return (
    GREETING_REGEX.test(line) ||
    SIGNATURE_REGEX.test(line) ||
    SIGNOFF_REGEX.test(line) ||
    SIGNATURE_NAME_REGEX.test(line)
  )
}

function shouldDropLine(line: string) {
  if (!line) {
    return false
  }
  if (UI_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
    return true
  }
  if (containsUiNoise(line)) {
    return true
  }
  if (isMenuFragment(line)) {
    return true
  }
  if (/^(summarise this email|search mail|translate to english|open in gmail)$/i.test(line)) {
    return true
  }
  return false
}

export interface SanitizedInput {
  cleanText: string
  wordCount: number
  nonEmptyLines: number
  substantiveLines: number
  greetingOrSignatureOnly: boolean
  removedLines: string[]
}

export function sanitizeEmailText(raw?: string | null): SanitizedInput {
  if (!raw) {
    return {
      cleanText: "",
      wordCount: 0,
      nonEmptyLines: 0,
      substantiveLines: 0,
      greetingOrSignatureOnly: false,
      removedLines: [],
    }
  }
  const normalizedRaw = raw.replace(/\r\n?/g, "\n")
  const lines = normalizedRaw.split("\n")
  const keptLines: string[] = []
  const removedLines: string[] = []

  for (const line of lines) {
    const trimmed = normalizeLine(line)
    if (!trimmed) {
      continue
    }
    if (shouldDropLine(trimmed)) {
      removedLines.push(trimmed)
      continue
    }
    keptLines.push(trimmed)
  }

  const cleaned = keptLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  const fallback = normalizedRaw.trim()
  const cleanText = cleaned || fallback
  const words = cleanText.split(/\s+/).filter(Boolean)
  const nonEmptyLines = keptLines.length
  const substantiveLines = keptLines.filter((line) => !isGreetingOrSignature(line)).length

  return {
    cleanText,
    wordCount: words.length,
    nonEmptyLines,
    substantiveLines,
    greetingOrSignatureOnly: nonEmptyLines > 0 && substantiveLines === 0,
    removedLines,
  }
}
