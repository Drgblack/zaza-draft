const DIAGNOSTIC_SENTENCE_PATTERN =
  /\b(?:adhd|add|autism spectrum|autism|autistic|dyslexia|dyspraxia|anxiety|anxious|depression|depressed|emotional problems?|mental health concerns?)\b/i

const UNSAFE_RECOVERY_PATTERN =
  /\b(?:adhd|add|autism spectrum|autism|autistic|dyslexia|dyspraxia|anxiety|anxious|depression|depressed|emotional problems?|mental health concerns?|deliberately|on purpose|attention[-\s]?seeking|manipulative|lazy|unmotivated|defiant|trying to avoid|doesn't care|wants attention|chooses not to)\b/i

const DEFAULT_OBSERVATION_TEXT =
  "He sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions."

function ensureSentence(text: string) {
  const trimmed = text.trim().replace(/^[,;:\-\s]+/, "").replace(/\s+/g, " ")
  if (!trimmed) {
    return ""
  }
  const normalized = trimmed[0].toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

function sanitizeObservationSegment(segment: string) {
  const normalized = ensureSentence(segment)
  if (!normalized) {
    return ""
  }

  if (UNSAFE_RECOVERY_PATTERN.test(normalized)) {
    return ""
  }

  return normalized
}

function splitIntoSegments(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function extractObservationSegment(segment: string) {
  if (!DIAGNOSTIC_SENTENCE_PATTERN.test(segment)) {
    return sanitizeObservationSegment(segment)
  }

  const becauseMatch = segment.match(/\bbecause\b([\s\S]*)$/i)
  if (becauseMatch?.[1]) {
    return sanitizeObservationSegment(becauseMatch[1])
  }

  const afterComma = segment.split(",").slice(1).join(",").trim()
  if (afterComma && !DIAGNOSTIC_SENTENCE_PATTERN.test(afterComma)) {
    return sanitizeObservationSegment(afterComma)
  }

  return ""
}

export interface DiagnosticRecoveryDraft {
  observationText: string
  generationPrompt: string
}

export function buildObservationOnlyRecoveryInput(sourceText: string): DiagnosticRecoveryDraft {
  const observationSegments = splitIntoSegments(sourceText)
    .map(extractObservationSegment)
    .filter(Boolean)

  const observationText =
    observationSegments.join(" ").trim() || DEFAULT_OBSERVATION_TEXT

  return {
    observationText,
    generationPrompt: [
      "Write a parent-safe message using observation-based wording only.",
      "Remove any medical, diagnostic, developmental, or psychological speculation.",
      "Keep the tone calm, teacher-authentic, and collaborative.",
      `Use these safe classroom notes: ${observationText}`,
    ].join(" "),
  }
}
