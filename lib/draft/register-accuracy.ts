export type RegisterViolation = {
  label: string
  phrase: string
  replacement: string | null
}

export const EN_REGISTER_VIOLATIONS: Array<{
  pattern: RegExp
  label: string
  replacement: string | null
  severity: "blocking" | "advisory"
}> = [
  { pattern: /\bmoving forward\b/gi, label: "moving forward", replacement: "", severity: "blocking" },
  { pattern: /\btouch base\b/gi, label: "touch base", replacement: "check in", severity: "blocking" },
  { pattern: /\bcircle back\b/gi, label: "circle back", replacement: "follow up", severity: "blocking" },
  { pattern: /\breach out\b/gi, label: "reach out", replacement: "get in touch", severity: "blocking" },
  { pattern: /\bper my last(?: email)?\b/gi, label: "per my last", replacement: null, severity: "blocking" },
  { pattern: /\bgoing forward\b/gi, label: "going forward", replacement: "", severity: "blocking" },
  { pattern: /\bas per\b/gi, label: "as per", replacement: "as", severity: "blocking" },
  { pattern: /\baction items\b/gi, label: "action items", replacement: "next steps", severity: "blocking" },
  { pattern: /\bin terms of\b/gi, label: "in terms of", replacement: "regarding", severity: "blocking" },
  { pattern: /\butilize\b/gi, label: "utilize", replacement: "use", severity: "blocking" },
  { pattern: /\blearnings\b/gi, label: "learnings", replacement: "lessons", severity: "blocking" },
  { pattern: /\bbest practices\b/gi, label: "best practices", replacement: "good practice", severity: "blocking" },
  { pattern: /\bstakeholders\b/gi, label: "stakeholders", replacement: "parents and staff", severity: "blocking" },
  { pattern: /\bdeliverables\b/gi, label: "deliverables", replacement: "outcomes", severity: "blocking" },
  { pattern: /\bat this point in time\b/gi, label: "at this point in time", replacement: "now", severity: "blocking" },
  { pattern: /\bproactive\b/gi, label: "proactive", replacement: "", severity: "blocking" },
  { pattern: /\bholistic\b/gi, label: "holistic", replacement: "", severity: "blocking" },
  { pattern: /\bsynerg(?:y|ies)\b/gi, label: "synergy / synergies", replacement: null, severity: "blocking" },
] as const

const EN_SPELLING_NORMALISATIONS = [
  { pattern: /\bbehavior\b/gi, replacement: "behaviour" },
  { pattern: /\bbehaviors\b/gi, replacement: "behaviours" },
  { pattern: /\bcolor\b/gi, replacement: "colour" },
  { pattern: /\bhonor\b/gi, replacement: "honour" },
  { pattern: /\borganize\b/gi, replacement: "organise" },
  { pattern: /\borganized\b/gi, replacement: "organised" },
  { pattern: /\borganizing\b/gi, replacement: "organising" },
  { pattern: /\brecognize\b/gi, replacement: "recognise" },
  { pattern: /\brecognized\b/gi, replacement: "recognised" },
  { pattern: /\bcenter\b/gi, replacement: "centre" },
  { pattern: /\bmodeling\b/gi, replacement: "modelling" },
  { pattern: /\bfulfillment\b/gi, replacement: "fulfilment" },
  { pattern: /\benrollment\b/gi, replacement: "enrolment" },
  { pattern: /\bdefense\b/gi, replacement: "defence" },
] as const

function clonePattern(pattern: RegExp) {
  return new RegExp(pattern.source, pattern.flags)
}

function preserveCase(source: string, replacement: string) {
  if (!source) {
    return replacement
  }

  if (source === source.toUpperCase()) {
    return replacement.toUpperCase()
  }

  if (source[0] === source[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }

  return replacement
}

function processOutsideQuotes(text: string, transform: (segment: string) => string) {
  const segments = text.split(/(".*?")/g)
  return segments
    .map((segment, index) => {
      if (index % 2 === 1 && segment.startsWith("\"") && segment.endsWith("\"")) {
        return segment
      }
      return transform(segment)
    })
    .join("")
}

function cleanRegisterSpacing(text: string) {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ", ")
    .replace(/^[,;:\-–—]+\s*/g, "")
    .replace(/\n[,;:\-–—]+\s*/g, "\n")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function detectRegisterViolations(text: string): RegisterViolation[] {
  const violations: RegisterViolation[] = []

  EN_REGISTER_VIOLATIONS.forEach(({ pattern, label, replacement }) => {
    const matcher = clonePattern(pattern)
    let match: RegExpExecArray | null = matcher.exec(text)
    while (match) {
      violations.push({
        label,
        phrase: match[0],
        replacement,
      })
      match = matcher.exec(text)
    }
  })

  return violations
}

export function applyRegisterCorrections(text: string): {
  corrected: string
  corrections: RegisterViolation[]
} {
  const corrections = detectRegisterViolations(text)
  let corrected = text

  EN_REGISTER_VIOLATIONS.forEach(({ pattern, replacement }) => {
    if (replacement === null) {
      return
    }

    corrected = processOutsideQuotes(corrected, (segment) =>
      segment.replace(clonePattern(pattern), (match) => preserveCase(match, replacement)),
    )
  })

  corrected = cleanRegisterSpacing(corrected)

  return {
    corrected,
    corrections,
  }
}

export function normaliseSpelling(text: string, locale: string) {
  if (!locale.toLowerCase().startsWith("en")) {
    return text
  }

  return cleanRegisterSpacing(
    processOutsideQuotes(text, (segment) => {
      let updated = segment
      EN_SPELLING_NORMALISATIONS.forEach(({ pattern, replacement }) => {
        updated = updated.replace(clonePattern(pattern), (match) => preserveCase(match, replacement))
      })
      return updated
    }),
  )
}
