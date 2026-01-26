const SIGNOFF_STARTERS = [
  "kind regards",
  "best regards",
  "regards",
  "yours sincerely",
  "yours faithfully",
  "sincerely",
  "mit freundlichen",
  "mit freundlichen grüßen",
  "freundliche grüße",
  "herzliche grüße",
]

function normalizeForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

const NORMALIZED_SIGNOFFS = SIGNOFF_STARTERS.map(normalizeForComparison).filter(Boolean)

function isSignoffLine(line: string) {
  const normalized = normalizeForComparison(line)
  if (!normalized) {
    return false
  }
  return NORMALIZED_SIGNOFFS.some((starter) => normalized.startsWith(starter))
}

function isLikelyNameLine(value: string) {
  if (!value) {
    return false
  }
  const cleaned = value.replace(/[^A-Za-zÄÖÜäöüß'\-\.\s]/g, "").trim()
  if (!cleaned) {
    return false
  }
  if (cleaned.length > 60) {
    return false
  }
  return /[A-Za-zÄÖÜäöüß]/.test(cleaned)
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
    if (isSignoffLine(lastLine)) {
      lines.pop()
      changed = true
      while (lines.length && !lines[lines.length - 1].trim()) {
        lines.pop()
      }
      if (lines.length && isLikelyNameLine(lines[lines.length - 1].trim())) {
        lines.pop()
      }
      continue
    }
    if (lines.length >= 2) {
      const penultimate = lines[lines.length - 2].trim()
      if (isSignoffLine(penultimate) && isLikelyNameLine(lastLine)) {
        lines.pop()
        lines.pop()
        changed = true
        continue
      }
    }
  }
  return lines.join("\n").trimEnd()
}

export function ensureSingleSignOff(raw: string | undefined | null, teacherName?: string) {
  const safeTeacher = (teacherName?.trim() || "").trim()
  const fallbackName = safeTeacher || "Class teacher"
  const baseText = stripTrailingSignOff(raw ?? "")
  const trimmedBody = baseText.trimEnd()
  const separator = trimmedBody ? "\n\n" : ""
  const signOff = `Kind regards,\n${fallbackName}`
  return `${trimmedBody}${separator}${signOff}`.trimEnd()
}
