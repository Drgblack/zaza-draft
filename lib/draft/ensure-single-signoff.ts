const SIGNOFF_STARTERS = [
  "kind regards",
  "best regards",
  "regards",
  "yours sincerely",
  "yours faithfully",
  "sincerely",
  "mit freundlichen grüßen",
  "freundliche grüße",
  "herzliche grüße",
]

const STARTER_PATTERN = SIGNOFF_STARTERS.map((starter) => starter.replace(/\s+/g, "\\s+")).join("|")

interface EnsureSingleSignOffOptions {
  closingLineOverride?: string
  fallbackName?: string
  locale?: string
  omit?: boolean
  signatureLines?: string[]
}

function isClosingLine(line: string) {
  const normalized = line.replace(/[.,;:]+$/, "").trim().toLowerCase()
  return SIGNOFF_STARTERS.some((starter) => normalized.startsWith(starter))
}

function looksLikeName(line: string) {
  if (!line) {
    return false
  }
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }
  return /[A-Za-zÄÖÜäöüß]/.test(trimmed)
}

function isSignatureLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }
  if (trimmed.length > 80) {
    return false
  }
  if (/[.!?]{2,}/.test(trimmed)) {
    return false
  }
  return /[A-Za-zÄÖÜäöüß]/.test(trimmed)
}

export function stripSignOff(text: string | undefined | null) {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trimEnd()
  if (!normalized) {
    return ""
  }
  const lines = normalized.split("\n")
  let changed = true
  while (changed && lines.length) {
    changed = false
    while (lines.length && !lines[lines.length - 1].trim()) {
      lines.pop()
      changed = true
    }
    if (!lines.length) {
      break
    }
    let closingIndex = -1
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (isClosingLine(lines[i].trim())) {
        closingIndex = i
        break
      }
    }
    if (closingIndex >= 0) {
      const trailingLines = lines
        .slice(closingIndex + 1)
        .map((line) => line.trim())
        .filter(Boolean)
      if (
        trailingLines.length <= 3 &&
        trailingLines.every((line) => looksLikeName(line) || isSignatureLine(line))
      ) {
        lines.splice(closingIndex)
        changed = true
        continue
      }
      if (closingIndex === lines.length - 1) {
        lines.pop()
        changed = true
        continue
      }
    }
    const lastLine = lines[lines.length - 1].trim()
    if (isClosingLine(lastLine)) {
      lines.pop()
      changed = true
      continue
    }
    if (lines.length >= 2) {
      const penultimate = lines[lines.length - 2].trim()
      if (isClosingLine(penultimate) && looksLikeName(lastLine)) {
        lines.pop()
        lines.pop()
        changed = true
        continue
      }
    }
  }
  return lines.join("\n").trimEnd()
}

function removeInlineSignOffs(text: string) {
  const pattern = new RegExp(`(?:\\s*(?:${STARTER_PATTERN})[.,!]?\\s*[^\\n]+)+\\s*$`, "i")
  let result = text
  while (true) {
    const trimmed = result.trimEnd()
    const match = pattern.exec(trimmed)
    if (!match || match.index === undefined) {
      return trimmed
    }
    result = trimmed.slice(0, match.index)
  }
}

export function ensureSingleSignOff(raw: string | undefined | null, teacherName?: string, locale?: string) {
  const name = (teacherName?.trim() || "").trim()
  const fallbackName = name || "Class teacher"
  const base = removeInlineSignOffs(stripSignOff(raw ?? ""))
  const content = base.trimEnd()
  const separator = content ? "\n\n" : ""
  const normalizedLocale = locale?.toLowerCase() ?? "en"
  const closing = normalizedLocale.startsWith("de") ? "Mit freundlichen Grüßen" : "Kind regards"
  return `${content}${separator}${closing},\n${fallbackName}`.trimEnd()
}

export function normalizeClosingBlock(raw: string | undefined | null, options: EnsureSingleSignOffOptions = {}) {
  const signatureLines =
    options.signatureLines?.map((line) => line.trim()).filter(Boolean) ??
    []
  const normalizedLocale = options.locale?.toLowerCase() ?? "en"
  const fallbackName =
    options.fallbackName?.trim() ||
    (normalizedLocale.startsWith("de") ? "Ihre Klassenlehrkraft" : "Your child's teacher")
  const base = removeInlineSignOffs(stripSignOff(raw ?? ""))
  const content = base.trimEnd()

  if (options.omit) {
    return content
  }

  const resolvedSignatureLines = signatureLines.length ? signatureLines : [fallbackName]
  const closing =
    options.closingLineOverride?.trim() ||
    (normalizedLocale.startsWith("de") ? "Mit freundlichen Grüßen," : "Kind regards,")
  const closingBlock = [closing, ...resolvedSignatureLines].join("\n")
  const separator = content ? "\n\n" : ""
  return `${content}${separator}${closingBlock}`.trimEnd()
}
