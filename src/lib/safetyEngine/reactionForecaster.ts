export interface ReactionForecast {
  collaborative: number
  concerned: number
  defensive: number
  hostile: number
  confused: number
}

type ReactionKey = keyof ReactionForecast

type ReactionWeights = Record<ReactionKey, number>

const REACTION_KEYS: ReactionKey[] = [
  "collaborative",
  "concerned",
  "defensive",
  "hostile",
  "confused",
]

const BASE_WEIGHTS: ReactionWeights = {
  collaborative: 20,
  concerned: 20,
  defensive: 20,
  hostile: 20,
  confused: 20,
}

const REACTION_ADJUSTMENTS: Record<string, Partial<ReactionWeights>> = {
  acc_your_child_negative: { defensive: 20, hostile: 10 },
  acc_character_claim: { defensive: 25, hostile: 15 },
  acc_label_attachment: { hostile: 30, defensive: 20 },
  acc_refusal_language: { defensive: 15 },
  acc_judgement_label: { defensive: 10 },
  esc_consequence_framing: { hostile: 25, defensive: 10 },
  esc_administrative_threat: { hostile: 20 },
  esc_formal_documentation: { hostile: 15 },
  pre_parental_directive: { hostile: 20, defensive: 10 },
  fru_exhaustion: { defensive: 10, concerned: 10 },
  fru_repetition_fatigue: { defensive: 15 },
  neg_state_claim: { defensive: 10, confused: 5 },
  cold_no_collaboration: { confused: 15, defensive: 5 },
  cold_no_greeting: { defensive: 5 },
  mit_collaborative_opener: { collaborative: 20, concerned: 10 },
  mit_evidence_phrasing: { collaborative: 15, concerned: 10 },
  mit_positive_observation: { collaborative: 20 },
  mit_meeting_invitation: { collaborative: 15 },
  mit_empathy: { collaborative: 10, concerned: 5 },
}

function normalizeWeights(weights: ReactionWeights): ReactionWeights {
  const total = REACTION_KEYS.reduce((sum, key) => sum + weights[key], 0)

  return REACTION_KEYS.reduce(
    (normalized, key) => {
      normalized[key] = (weights[key] / total) * 100
      return normalized
    },
    {} as ReactionWeights,
  )
}

function suppressLowHostile(normalizedWeights: ReactionWeights): ReactionWeights {
  if (normalizedWeights.hostile > 15) {
    return normalizedWeights
  }

  const redistributedWeights = { ...normalizedWeights }
  const hostileWeight = redistributedWeights.hostile
  redistributedWeights.hostile = 0

  const otherKeys = REACTION_KEYS.filter((key) => key !== "hostile")
  const otherTotal = otherKeys.reduce((sum, key) => sum + redistributedWeights[key], 0)

  for (const key of otherKeys) {
    redistributedWeights[key] += (redistributedWeights[key] / otherTotal) * hostileWeight
  }

  return redistributedWeights
}

function roundForecast(weights: ReactionWeights): ReactionForecast {
  const roundedEntries = REACTION_KEYS.map((key) => ({
    key,
    rounded: Math.round(weights[key]),
    delta: weights[key] - Math.round(weights[key]),
  }))

  let total = roundedEntries.reduce((sum, entry) => sum + entry.rounded, 0)

  if (total < 100) {
    const ordered = [...roundedEntries].sort((a, b) => b.delta - a.delta)

    for (const entry of ordered) {
      if (total >= 100) {
        break
      }
      entry.rounded += 1
      total += 1
    }
  }

  if (total > 100) {
    const ordered = [...roundedEntries].sort((a, b) => a.delta - b.delta)

    for (const entry of ordered) {
      if (total <= 100) {
        break
      }
      entry.rounded -= 1
      total -= 1
    }
  }

  return roundedEntries.reduce(
    (forecast, entry) => {
      forecast[entry.key] = entry.rounded
      return forecast
    },
    {} as ReactionForecast,
  )
}

export function forecastReactions(firedSignalIds: string[], wordCount: number): ReactionForecast {
  const weights: ReactionWeights = { ...BASE_WEIGHTS }

  for (const signalId of firedSignalIds) {
    const adjustments = REACTION_ADJUSTMENTS[signalId]

    if (!adjustments) {
      continue
    }

    for (const key of REACTION_KEYS) {
      weights[key] += adjustments[key] ?? 0
    }
  }

  if (!firedSignalIds.includes("mit_evidence_phrasing") && wordCount > 20) {
    weights.confused += 15
  }

  const normalizedWeights = normalizeWeights(weights)
  const redistributedWeights = suppressLowHostile(normalizedWeights)

  return roundForecast(redistributedWeights)
}
