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

function stripTrailingSignOff(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trimEnd()
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
    const lastLine = lines[lines.length - 1].trim()
    if (isClosingLine(lastLine)) {
      lines.pop()
      changed = true
      while (lines.length && !lines[lines.length - 1].trim()) {
        lines.pop()
      }
      if (lines.length && looksLikeName(lines[lines.length - 1])) {
        lines.pop()
      }
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
  const base = removeInlineSignOffs(stripTrailingSignOff(raw ?? ""))
  const content = base.trimEnd()
  const separator = content ? "\n\n" : ""
  const normalizedLocale = locale?.toLowerCase() ?? "en"
  const closing = normalizedLocale.startsWith("de") ? "Mit freundlichen Grüßen" : "Kind regards"
  return `${content}${separator}${closing},\n${fallbackName}`.trimEnd()
}
