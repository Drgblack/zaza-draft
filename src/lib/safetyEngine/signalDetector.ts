import safetySignalsData from "../../config/safetySignals.json"

export type SignalCategory =
  | "accusation"
  | "escalation"
  | "frustration"
  | "negative_generalisation"
  | "emotional_coldness"
  | "prescriptive_demand"
  | "professional_risk"
  | "mitigating"

export interface Signal {
  id: string
  category: SignalCategory
  label: string
  weight: number
  patterns: string[]
  matchMode: "any" | "all" | "absence"
  proximityBoost: boolean
  detectionNote: string
  requiresCoContext?: string[]
}

export interface FiredSignal extends Signal {
  adjustedWeight: number
}

const safetySignals = safetySignalsData.signals as Signal[]

function splitSentences(rawMessage: string): string[] {
  const sentences = rawMessage.match(/[^.!?]+[.!?]?/g)

  if (!sentences) {
    return []
  }

  return sentences.map((sentence) => sentence.trim()).filter(Boolean)
}

function matchesPattern(text: string, pattern: string): boolean {
  return new RegExp(pattern, "i").test(text)
}

function isSignalMatched(signal: Signal, rawMessage: string): boolean {
  if (signal.patterns.length === 0) {
    return false
  }

  const matchedPatterns = signal.patterns.filter((pattern) => matchesPattern(rawMessage, pattern))

  if (signal.matchMode === "absence") {
    return matchedPatterns.length === 0
  }

  if (signal.matchMode === "all") {
    return matchedPatterns.length === signal.patterns.length
  }

  return matchedPatterns.length > 0
}

function hasEdgeSentenceMatch(signal: Signal, sentences: string[]): boolean {
  if (signal.matchMode === "absence" || sentences.length === 0) {
    return false
  }

  const edgeSentences =
    sentences.length === 1 ? [sentences[0]] : [sentences[0], sentences[sentences.length - 1]]

  return edgeSentences.some((sentence) =>
    signal.patterns.some((pattern) => matchesPattern(sentence, pattern)),
  )
}

export function detectSignals(
  rawMessage: string,
  options?: {
    suppressSignalIds?: string[]
  },
): FiredSignal[] {
  const sentences = splitSentences(rawMessage)
  const suppressSignalIds = new Set(options?.suppressSignalIds ?? [])

  return safetySignals
    .filter((signal) => !suppressSignalIds.has(signal.id))
    .filter((signal) => isSignalMatched(signal, rawMessage))
    .map((signal) => ({
      ...signal,
      adjustedWeight:
        signal.proximityBoost && hasEdgeSentenceMatch(signal, sentences)
          ? signal.weight * 1.25
          : signal.weight,
    }))
}
