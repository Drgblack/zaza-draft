const KNOWN_LABEL_LINES: RegExp[] = [
  /^active(?:\s*✓)?$/i,
  /^zaza$/i,
  /^support\s*@/i,
  /^support@/i,
]

function containsCatchAll(line: string) {
  return /catch-all/i.test(line) && line.length <= 80
}

function isLabelLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) {
    return false
  }
  if (KNOWN_LABEL_LINES.some((pattern) => pattern.test(trimmed))) {
    return true
  }
  return containsCatchAll(trimmed)
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

    if (isLabelLine(trimmed)) {
      continue
    }

    sanitizedLines.push(trimmed)
    lastWasBlank = false
  }

  const joined = sanitizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  return joined
}
