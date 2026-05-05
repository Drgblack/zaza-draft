import { normalizeParentFacingGreetingLine, type GreetingLocale } from "./greeting-resolution"

function resolveGreetingLocale(greetingLine: string): GreetingLocale {
  return /^(guten tag|hallo|sehr geehrte|sehr geehrter)/i.test(greetingLine.trim()) ? "de" : "en"
}

function stripGreetingResidue(
  lines: string[],
  startIndex: number,
  greetingLine: string,
  locale: GreetingLocale,
) {
  let nonEmptySeen = 0
  for (let i = startIndex; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      continue
    }

    nonEmptySeen += 1
    if (nonEmptySeen > 3) {
      break
    }

    if (trimmed === greetingLine) {
      lines[i] = ""
      continue
    }

    const englishMatch =
      locale === "en"
        ? trimmed.match(/^(?:hello|hi|dear)\s*,\s*(.+)$/i)
        : trimmed.match(/^(?:guten tag|hallo)\s*,\s*(.+)$/i)
    if (englishMatch?.[1]) {
      lines[i] = englishMatch[1].trim()
      break
    }

    const normalizedMatch =
      trimmed.startsWith(`${greetingLine} `) || trimmed.startsWith(`${greetingLine}\t`)
    if (normalizedMatch) {
      lines[i] = trimmed.slice(greetingLine.length).trim()
      break
    }
  }
}

export function enforceGreetingLine(body: string, greetingLine: string) {
  if (!greetingLine) {
    return body
  }

  const locale = resolveGreetingLocale(greetingLine)
  const normalizedGreeting = normalizeParentFacingGreetingLine(greetingLine.trim(), locale)
  if (!normalizedGreeting) {
    return body
  }

  const lines = body.split(/\r?\n/)
  let index = 0
  while (index < lines.length && !lines[index].trim()) {
    index += 1
  }

  if (index === lines.length) {
    return normalizedGreeting
  }

  if (lines[index].trim() === normalizedGreeting) {
    stripGreetingResidue(lines, index + 1, normalizedGreeting, locale)
    return lines.join("\n")
  }

  const firstLine = lines[index].trim()
  const commaIndex = firstLine.indexOf(",")
  if (commaIndex >= 0) {
    const remainder = firstLine.slice(commaIndex + 1).trim()
    if (remainder) {
      lines.splice(index, 1, normalizedGreeting, "", remainder)
      return lines.join("\n")
    }
  }

  lines[index] = normalizedGreeting
  stripGreetingResidue(lines, index + 1, normalizedGreeting, locale)
  return lines.join("\n")
}

export function applyFinalGreetingGuard(body: string, greetingLine?: string | null) {
  if (!greetingLine) {
    return body
  }
  return enforceGreetingLine(body, greetingLine)
}

function isGreetingStarter(line: string) {
  return /^(?:dear|hi|hello|guten tag|hallo|sehr geehrte|sehr geehrter)\b/i.test(line.trim())
}

export function stripLeadingGeneratedGreeting(body: string) {
  const lines = body.split(/\r?\n/)
  let index = 0

  while (index < lines.length && !lines[index].trim()) {
    index += 1
  }

  if (index >= lines.length) {
    return body
  }

  const firstLine = lines[index].trim()
  if (!isGreetingStarter(firstLine)) {
    return body
  }

  const firstCommaIndex = firstLine.indexOf(",")
  if (firstCommaIndex >= 0) {
    const remainder = firstLine.slice(firstCommaIndex + 1).trim()
    if (remainder) {
      lines[index] = remainder
      return lines.join("\n")
    }
  }

  lines.splice(index, 1)
  while (index < lines.length && !lines[index].trim()) {
    lines.splice(index, 1)
  }
  return lines.join("\n").trimStart()
}
