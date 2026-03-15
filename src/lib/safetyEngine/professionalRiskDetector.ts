import safetySignalsData from "../../config/safetySignals.json"

import type { Signal } from "./signalDetector"

export interface ProfessionalRiskFlag {
  signalId: string
  label: string
  matchedPhrase: string
}

const professionalRiskSignals = (safetySignalsData.signals as Signal[]).filter(
  (signal) => signal.category === "professional_risk",
)

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

export function detectProfessionalRiskFlags(rawMessage: string): ProfessionalRiskFlag[] {
  return professionalRiskSignals
    .map((signal) => {
      const matchedPhrase = getMatchedPhrase(rawMessage, signal.patterns)

      if (!matchedPhrase) {
        return null
      }

      return {
        signalId: signal.id,
        label: signal.label,
        matchedPhrase,
      }
    })
    .filter((flag): flag is ProfessionalRiskFlag => Boolean(flag))
}
