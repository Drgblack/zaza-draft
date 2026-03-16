const DIAGNOSTIC_SENTENCE_PATTERN =
  /\b(?:adhd|add|autism spectrum|autism|autistic|dyslexia|dyspraxia|anxiety|anxious|depression|depressed|emotional problems?|mental health concerns?)\b/i

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

function splitIntoSegments(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function extractObservationSegment(segment: string) {
  if (!DIAGNOSTIC_SENTENCE_PATTERN.test(segment)) {
    return ensureSentence(segment)
  }

  const becauseMatch = segment.match(/\bbecause\b([\s\S]*)$/i)
  if (becauseMatch?.[1]) {
    return ensureSentence(becauseMatch[1])
  }

  const afterComma = segment.split(",").slice(1).join(",").trim()
  if (afterComma && !DIAGNOSTIC_SENTENCE_PATTERN.test(afterComma)) {
    return ensureSentence(afterComma)
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
