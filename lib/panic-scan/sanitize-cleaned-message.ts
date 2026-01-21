const KNOWN_LABEL_LINES: RegExp[] = [
  /^active(?:\s*(?:\u2713|\u2714|V))?$/i,
  /^zaza$/i,
  /^support\s*@/i,
  /^support@/i,
]

const POSITION_LINE = /^\d+\s+of\s+\d[\d,]*$/i
const TIME_AGO_LINE = /^\d{1,2}:\d{2}\s*\([^)]*\b(ago|minutes?|hours?|days?)\b[^)]*\)$/i
const WEEKDAY_TIME_AGO_LINE =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b.*\b\d{1,2}:\d{2}\b.*\b(ago|minutes?|hours?|days?)\b.*$/i
const CHECKBOX_LINE = /^\d+\s*[\u2611\u2610\u25A1\u2713\u2714](?:\uFE0E|\uFE0F)?$/u

const GMAIL_SENDER_PATTERN = /\( *(?:gmail|googlemail)\.com *\)$/i
const TWO_NUMBER_LINE = /^\d+\s+\d+$/
const CATCH_ALL_PATTERN = /catch-all/i

function isNoiseLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }
  if (KNOWN_LABEL_LINES.some((pattern) => pattern.test(trimmed))) {
    return true
  }
  if (POSITION_LINE.test(trimmed)) {
    return true
  }
  if (TIME_AGO_LINE.test(trimmed)) {
    return true
  }
  if (WEEKDAY_TIME_AGO_LINE.test(trimmed) && trimmed.length < 60) {
    return true
  }
  if (CHECKBOX_LINE.test(trimmed) && trimmed.length < 12) {
    return true
  }
  if (GMAIL_SENDER_PATTERN.test(trimmed) && trimmed.length < 80) {
    return true
  }
  if (TWO_NUMBER_LINE.test(trimmed) && trimmed.length < 8) {
    return true
  }
  if (CATCH_ALL_PATTERN.test(trimmed) && trimmed.length <= 80) {
    return true
  }
  return false
}

export function sanitizeCleanedMessage(raw?: string | null) {
  if (!raw) {
    return ""
  }
  const lines = raw.split(/\r?\n/)
  const sanitizedLines: string[] = []
  let lastWasBlank = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (sanitizedLines.length && !lastWasBlank) {
        sanitizedLines.push("")
      }
      lastWasBlank = true
      continue
    }

    if (isNoiseLine(trimmed)) {
      continue
    }

    sanitizedLines.push(trimmed)
    lastWasBlank = false
  }

  const joined = sanitizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return joined
}
