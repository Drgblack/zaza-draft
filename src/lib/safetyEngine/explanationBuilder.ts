import type { SignalCategory } from "./signalDetector"

export interface ExplanationSignal {
  id: string
  category: SignalCategory
  label: string
  matchedPhrase?: string
  weight?: number
  adjustedWeight?: number
}

const CATEGORY_REWRITE_ACTIONS: Record<
  Exclude<SignalCategory, "mitigating" | "professional_risk">,
  string
> = {
  accusation: "replaced with observation-based phrasing",
  escalation: "softened to a collaborative next step",
  frustration: "removed to maintain a calm, professional tone",
  negative_generalisation: "replaced with a specific, time-bounded observation",
  prescriptive_demand: "replaced with a collaborative invitation",
  emotional_coldness: "added warm greeting / collaboration invitation",
}

const STRUCTURAL_IMBALANCE_LINE =
  "Message contains only negative observations — no positive context found"

function getSignalPriority(signal: ExplanationSignal): number {
  return signal.adjustedWeight ?? signal.weight ?? 0
}

function buildSignalLine(signal: ExplanationSignal): string | null {
  if (signal.category === "mitigating" || signal.category === "professional_risk") {
    return null
  }

  return `${signal.label} detected — ${CATEGORY_REWRITE_ACTIONS[signal.category]}`
}

export function buildExplanationLines(
  firedSignals: ExplanationSignal[],
  structuralImbalance: boolean,
): string[] {
  const explanationLines: string[] = []

  if (structuralImbalance) {
    explanationLines.push(STRUCTURAL_IMBALANCE_LINE)
  }

  const remainingSlots = 4 - explanationLines.length

  if (remainingSlots <= 0) {
    return explanationLines
  }

  const signalLines = firedSignals
    .slice()
    .sort((left, right) => getSignalPriority(right) - getSignalPriority(left))
    .map(buildSignalLine)
    .filter((line): line is string => Boolean(line))
    .slice(0, remainingSlots)

  return [...explanationLines, ...signalLines]
}
