import { buildExplanationLines } from "./explanationBuilder"
import { detectProfessionalRiskFlags, type ProfessionalRiskFlag } from "./professionalRiskDetector"
import { forecastReactions, type ReactionForecast } from "./reactionForecaster"
import { scoreSafetySignals } from "./scorer"
import { detectSignals, type FiredSignal, type Signal } from "./signalDetector"
import { classifyTone, type ToneClass } from "./toneClassifier"
import { detectTopicSensitivity, type TopicSensitivity } from "./topicDetector"

export interface SafetyEngineInput {
  rawMessage: string
  messageDirection: string
  inputMode: string
  suppressSignalIds?: string[]
}

export interface SafetyEngineOutput {
  riskScore: number
  riskLevel: "low" | "medium" | "high"
  triggeredSignals: Signal[]
  toneClass: ToneClass
  topicSensitivity: TopicSensitivity
  reactionForecast: ReactionForecast
  explanationLines: string[]
  documentationModeAvailable: boolean
  professionalRiskFlags: ProfessionalRiskFlag[]
  structuralImbalance: boolean
}

type TriggeredSignal = FiredSignal & {
  matchedPhrase?: string
}

const NEGATIVE_CATEGORIES = new Set([
  "accusation",
  "escalation",
  "frustration",
  "negative_generalisation",
  "prescriptive_demand",
] as const)

function countWords(rawMessage: string): number {
  return rawMessage.trim().split(/\s+/).filter(Boolean).length
}

function splitSentences(rawMessage: string): string[] {
  const sentences = rawMessage.match(/[^.!?]+[.!?]?/g)

  if (!sentences) {
    return []
  }

  return sentences.map((sentence) => sentence.trim()).filter(Boolean)
}

function getMatchedPhrase(rawMessage: string, patterns: string[]): string | null {
  let bestMatch: RegExpExecArray | null = null

  for (const pattern of patterns) {
    const match = new RegExp(pattern, "i").exec(rawMessage)

    if (!match?.[0]) {
      continue
    }

    if (!bestMatch) {
      bestMatch = match
      continue
    }

    const bestIndex = bestMatch.index ?? Number.POSITIVE_INFINITY
    const currentIndex = match.index ?? Number.POSITIVE_INFINITY

    if (currentIndex < bestIndex) {
      bestMatch = match
      continue
    }

    if (currentIndex === bestIndex && match[0].length > bestMatch[0].length) {
      bestMatch = match
    }
  }

  return bestMatch?.[0] ?? null
}

function signalMatchesSentence(signal: FiredSignal, sentence: string): boolean {
  if (signal.patterns.length === 0 || signal.matchMode === "absence") {
    return false
  }

  const matchedPatternCount = signal.patterns.filter((pattern) =>
    new RegExp(pattern, "i").test(sentence),
  ).length

  if (signal.matchMode === "all") {
    return matchedPatternCount === signal.patterns.length
  }

  return matchedPatternCount > 0
}

function detectStructuralImbalance(rawMessage: string, firedSignals: FiredSignal[]): boolean {
  const sentences = splitSentences(rawMessage)

  const negativeCount = sentences.filter((sentence) =>
    firedSignals.some(
      (signal) => NEGATIVE_CATEGORIES.has(signal.category as (typeof NEGATIVE_CATEGORIES extends Set<infer T> ? T : never)) && signalMatchesSentence(signal, sentence),
    ),
  ).length

  const positiveCount = sentences.filter((sentence) =>
    firedSignals.some((signal) => signal.category === "mitigating" && signalMatchesSentence(signal, sentence)),
  ).length

  return negativeCount > 2 && positiveCount === 0
}

function annotateTriggeredSignals(rawMessage: string, firedSignals: FiredSignal[]): TriggeredSignal[] {
  return firedSignals.map((signal) => ({
    ...signal,
    matchedPhrase: signal.matchMode === "absence" ? undefined : getMatchedPhrase(rawMessage, signal.patterns) ?? undefined,
  }))
}

export async function runSafetyEngine(
  input: SafetyEngineInput,
): Promise<SafetyEngineOutput | null> {
  const wordCount = countWords(input.rawMessage)
  const messageDirection =
    typeof input.messageDirection === "string" ? input.messageDirection.trim() : ""

  if (messageDirection !== "teacher_to_parent") {
    return null
  }

  if (wordCount < 10) {
    return null
  }

  if (input.inputMode === "positive_feedback") {
    return null
  }

  const firedSignals = detectSignals(input.rawMessage, {
    suppressSignalIds: input.suppressSignalIds,
  })
  const topicSensitivity = detectTopicSensitivity(input.rawMessage)
  const structuralImbalance = detectStructuralImbalance(input.rawMessage, firedSignals)
  let toneClass: ToneClass = "clinical"
  let toneModifier = 0
  try {
    const toneResult = await classifyTone(input.rawMessage)
    toneClass = toneResult.toneClass
    toneModifier = toneResult.toneModifier
  } catch (error) {
    console.warn("[safety-engine] tone classification fallback", {
      errorClass: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
  }
  const { riskScore, riskLevel } = scoreSafetySignals(
    firedSignals,
    topicSensitivity,
    structuralImbalance,
    toneModifier,
  )
  const reactionForecast = forecastReactions(
    firedSignals.map((signal) => signal.id),
    wordCount,
  )
  const triggeredSignals = annotateTriggeredSignals(input.rawMessage, firedSignals)
  const explanationLines = buildExplanationLines(triggeredSignals, structuralImbalance)
  const professionalRiskFlags = detectProfessionalRiskFlags(input.rawMessage)
  const documentationModeAvailable =
    topicSensitivity === "high" ||
    firedSignals.some((signal) => signal.category === "escalation") ||
    firedSignals.some((signal) => signal.id === "acc_label_attachment")

  return {
    riskScore,
    riskLevel,
    triggeredSignals,
    toneClass,
    topicSensitivity,
    reactionForecast,
    explanationLines,
    documentationModeAvailable,
    professionalRiskFlags,
    structuralImbalance,
  }
}
