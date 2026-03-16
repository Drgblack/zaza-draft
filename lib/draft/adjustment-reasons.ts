import type { DeescalationSummary } from "@/lib/deescalation/types"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

function hasTriggeredSignal(
  analysis: Pick<SafetyEngineOutput, "triggeredSignals"> | null | undefined,
  predicate: (signal: SafetyEngineOutput["triggeredSignals"][number]) => boolean,
) {
  return (analysis?.triggeredSignals ?? []).some(predicate)
}

function hasProfessionalRiskFlag(
  analysis: Pick<SafetyEngineOutput, "professionalRiskFlags"> | null | undefined,
  signalId: string,
) {
  return (analysis?.professionalRiskFlags ?? []).some((flag) => flag.signalId === signalId)
}

function pushReason(reasons: string[], reason: string, condition: boolean) {
  if (condition && !reasons.includes(reason)) {
    reasons.push(reason)
  }
}

export function buildDraftAdjustmentReasons(options: {
  inputSafetyAnalysis?: SafetyEngineOutput | null
  outputSafetyAnalysis?: SafetyEngineOutput | null
  deescalationSummary?: DeescalationSummary | null
}) {
  const { inputSafetyAnalysis, outputSafetyAnalysis, deescalationSummary } = options
  const reasons: string[] = []
  const deescalationCategories = new Set(
    (deescalationSummary?.flaggedPhrases ?? []).map((phrase) => phrase.category),
  )

  const judgementResolved =
    (hasTriggeredSignal(
      inputSafetyAnalysis,
      (signal) => signal.category === "accusation" || signal.category === "negative_generalisation",
    ) &&
      !hasTriggeredSignal(
        outputSafetyAnalysis,
        (signal) => signal.category === "accusation" || signal.category === "negative_generalisation",
      )) ||
    deescalationCategories.has("insult") ||
    deescalationCategories.has("absolute") ||
    deescalationCategories.has("inflammatory")
  pushReason(
    reasons,
    "Replaced judgement wording with observation-based phrasing",
    judgementResolved,
  )

  const diagnosticResolved =
    hasProfessionalRiskFlag(inputSafetyAnalysis, "pro_medical_speculation") &&
    !hasProfessionalRiskFlag(outputSafetyAnalysis, "pro_medical_speculation")
  pushReason(reasons, "Removed diagnostic speculation", diagnosticResolved)

  const collaborationAdded =
    hasTriggeredSignal(inputSafetyAnalysis, (signal) => signal.id === "cold_no_collaboration") &&
    !hasTriggeredSignal(outputSafetyAnalysis, (signal) => signal.id === "cold_no_collaboration")
  pushReason(reasons, "Added a more collaborative next step", collaborationAdded)

  const escalationSoftened =
    (hasTriggeredSignal(inputSafetyAnalysis, (signal) => signal.category === "escalation") &&
      !hasTriggeredSignal(outputSafetyAnalysis, (signal) => signal.category === "escalation")) ||
    (hasProfessionalRiskFlag(inputSafetyAnalysis, "pro_legal_certainty") &&
      !hasProfessionalRiskFlag(outputSafetyAnalysis, "pro_legal_certainty")) ||
    deescalationCategories.has("threat")
  pushReason(reasons, "Softened escalation risk", escalationSoftened)

  const observationReframe =
    ((hasProfessionalRiskFlag(inputSafetyAnalysis, "pro_motive_attribution") &&
      !hasProfessionalRiskFlag(outputSafetyAnalysis, "pro_motive_attribution")) ||
      (hasProfessionalRiskFlag(inputSafetyAnalysis, "pro_psychological_interpretation") &&
        !hasProfessionalRiskFlag(outputSafetyAnalysis, "pro_psychological_interpretation")))
  pushReason(reasons, "Reframed behaviour as classroom observation", observationReframe)

  const directiveResolved =
    hasTriggeredSignal(inputSafetyAnalysis, (signal) => signal.category === "prescriptive_demand") &&
    !hasTriggeredSignal(outputSafetyAnalysis, (signal) => signal.category === "prescriptive_demand")
  pushReason(reasons, "Replaced directive language with parent-safe wording", directiveResolved)

  return reasons.slice(0, 5)
}

export function shouldShowToneSofteningExplanation(
  explanationTier: "tier1" | "tier2" | "tier3" | null,
  adjustmentReasons: string[],
) {
  return Boolean(explanationTier) && adjustmentReasons.length === 0
}

const ADJUSTMENT_SUMMARY_FRAGMENTS: Record<string, string> = {
  "Replaced judgement wording with observation-based phrasing":
    "replaced judgmental wording with observation-based phrasing",
  "Removed diagnostic speculation": "removed diagnostic speculation",
  "Added a more collaborative next step": "added a collaborative next step",
  "Softened escalation risk": "softened escalation language",
  "Reframed behaviour as classroom observation": "reframed behaviour as classroom observation",
  "Replaced directive language with parent-safe wording": "made the wording more parent-appropriate",
}

export function buildDraftAdjustmentSummary(adjustmentReasons: string[]) {
  const fragments = adjustmentReasons
    .map((reason) => ADJUSTMENT_SUMMARY_FRAGMENTS[reason])
    .filter((fragment): fragment is string => Boolean(fragment))
    .slice(0, 2)

  if (fragments.length === 0) {
    return null
  }

  if (fragments.length === 1) {
    return `Draft ${fragments[0]}.`
  }

  return `Draft ${fragments[0]} and ${fragments[1]}.`
}
