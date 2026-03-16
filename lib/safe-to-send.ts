import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"
import type { ReactionForecast } from "@/src/lib/safetyEngine/reactionForecaster"

export type SafeToSendStatus =
  | "SAFE_TO_SEND"
  | "REVIEW_ONCE_MORE"
  | "ESCALATION_RISK"

export interface SafeToSendAssessment {
  status: SafeToSendStatus
  titleKey: string
  descriptionKey: string
}

interface SafeToSendInput {
  safetyAnalysis?: Pick<
    SafetyEngineOutput,
    "riskLevel" | "toneClass" | "triggeredSignals" | "reactionForecast" | "professionalRiskFlags"
  > | null
  deescalationSummary?: DeescalationSummary | null
}

function getEscalationProbability(
  reactionForecast?: ReactionForecast,
) {
  if (!reactionForecast) {
    return 0
  }

  return (reactionForecast.hostile ?? 0) + Math.round((reactionForecast.defensive ?? 0) * 0.6)
}

export function assessSafeToSend(
  input: SafeToSendInput,
): SafeToSendAssessment | null {
  const safetyAnalysis = input.safetyAnalysis
  if (!safetyAnalysis) {
    return null
  }

  const riskFlagsDetected =
    (safetyAnalysis.triggeredSignals?.length ?? 0) +
    (safetyAnalysis.professionalRiskFlags?.length ?? 0)
  const escalationSignalDetected = (safetyAnalysis.triggeredSignals ?? []).some(
    (signal) => signal.category === "escalation",
  )
  const accusationSignalDetected = (safetyAnalysis.triggeredSignals ?? []).some(
    (signal) =>
      signal.category === "accusation" ||
      signal.category === "negative_generalisation" ||
      signal.category === "prescriptive_demand",
  )
  const toneClass = safetyAnalysis.toneClass
  const escalationProbability = getEscalationProbability(safetyAnalysis.reactionForecast)
  const defensiveReaction = (safetyAnalysis.reactionForecast?.defensive ?? 0) >= 35
  const hostileReaction = (safetyAnalysis.reactionForecast?.hostile ?? 0) >= 25
  const rewriteModifications =
    (input.deescalationSummary?.flaggedPhrases?.length ?? 0) +
    (input.deescalationSummary?.wasDeescalated ? 1 : 0)

  if (
    escalationSignalDetected ||
    accusationSignalDetected ||
    safetyAnalysis.riskLevel === "high" ||
    toneClass === "accusatory" ||
    escalationProbability >= 45 ||
    hostileReaction ||
    defensiveReaction
  ) {
    return {
      status: "ESCALATION_RISK",
      titleKey: "draft.safeToSend.sensitiveTopic.title",
      descriptionKey: "draft.safeToSend.sensitiveTopic.description",
    }
  }

  if (
    riskFlagsDetected > 0 ||
    toneClass === "defensive" ||
    escalationProbability >= 25 ||
    rewriteModifications > 0
  ) {
    return {
      status: "REVIEW_ONCE_MORE",
      titleKey: "draft.safeToSend.reviewOnceMore.title",
      descriptionKey: "draft.safeToSend.reviewOnceMore.description",
    }
  }

  return {
    status: "SAFE_TO_SEND",
    titleKey: "draft.safeToSend.safeToSend.title",
    descriptionKey: "draft.safeToSend.safeToSend.description",
  }
}
