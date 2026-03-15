import type { FiredSignal, SignalCategory } from "./signalDetector"
import type { TopicSensitivity } from "./topicDetector"

export interface SafetyScore {
  riskScore: number
  riskLevel: "low" | "medium" | "high"
}

const CATEGORY_CAPS: Partial<Record<SignalCategory, number>> = {
  accusation: 30,
  escalation: 25,
  frustration: 15,
  negative_generalisation: 20,
  prescriptive_demand: 20,
  emotional_coldness: 10,
}

const TOPIC_MULTIPLIERS: Record<TopicSensitivity, number> = {
  high: 1.5,
  medium: 1.2,
  low: 1,
}

const TONE_MODIFIER = 0

function getCappedSignalSum(firedSignals: FiredSignal[]): number {
  const categoryTotals = new Map<SignalCategory, number>()

  for (const signal of firedSignals) {
    if (signal.category === "professional_risk") {
      continue
    }

    categoryTotals.set(signal.category, (categoryTotals.get(signal.category) ?? 0) + signal.adjustedWeight)
  }

  let cappedSum = 0

  for (const [category, total] of categoryTotals.entries()) {
    if (category === "mitigating") {
      cappedSum += total
      continue
    }

    const cap = CATEGORY_CAPS[category]
    cappedSum += cap === undefined ? total : Math.min(total, cap)
  }

  return cappedSum
}

function getRiskLevel(riskScore: number): "low" | "medium" | "high" {
  if (riskScore <= 35) {
    return "low"
  }

  if (riskScore <= 65) {
    return "medium"
  }

  return "high"
}

function getNonMitigatingCategoryCount(firedSignals: FiredSignal[]): number {
  return new Set(
    firedSignals
      .filter((signal) => signal.category !== "mitigating" && signal.category !== "professional_risk")
      .map((signal) => signal.category),
  ).size
}

export function scoreSafetySignals(
  firedSignals: FiredSignal[],
  topicSensitivity: TopicSensitivity,
  structuralImbalance: boolean,
  toneModifier: number,
): SafetyScore {
  const cappedSignalSum = getCappedSignalSum(firedSignals)
  const rawScore = cappedSignalSum + toneModifier + (structuralImbalance ? 10 : 0)
  const riskScore = Math.min(100, Math.max(0, rawScore * TOPIC_MULTIPLIERS[topicSensitivity]))

  let riskLevel = getRiskLevel(riskScore)

  if (riskLevel === "high" && getNonMitigatingCategoryCount(firedSignals) < 2) {
    riskLevel = "medium"
  }

  return {
    riskScore,
    riskLevel,
  }
}
