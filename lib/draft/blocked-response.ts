import type { BlockedLanguageTier } from "@/lib/safety"

const TEACHER_NOTES: Record<BlockedLanguageTier, string> = {
  tier1: "I softened the wording to keep it professional and parent-appropriate.",
  tier2: "I softened the wording while keeping the situation factual and respectful.",
  tier3: "I can’t help write threatening or harmful language. I’m happy to help you write a firm, professional boundary message instead.",
}

const ALTERNATIVES = [
  "Try describing the behaviour or action you need help addressing, without personal attacks.",
  "I can help you outline clear, calm boundaries that reinforce expectations and invite collaboration.",
]

const DIAGNOSTIC_TERMS = ["adhd", "add", "autism", "autistic", "depressed", "anxious"]

function isDiagnosticSpeculationMatch(matches: string[] = []) {
  return matches.some((match) =>
    DIAGNOSTIC_TERMS.some((term) => match.toLowerCase().includes(term)),
  )
}

export interface BlockedLanguageResponse {
  title?: string
  message: string
  teacherNote: string
  safeAlternatives: string[]
  actionLabel?: string
  variant?: "default" | "diagnostic_speculation"
}

export function buildBlockedLanguageResponse(
  tier: BlockedLanguageTier,
  matches: string[] = [],
): BlockedLanguageResponse {
  if (tier === "tier2" && isDiagnosticSpeculationMatch(matches)) {
    return {
      title: "Draft paused this message for safety",
      message: "Draft paused this message for safety.",
      teacherNote:
        "This draft includes medical or diagnostic speculation, which teachers should avoid in parent communication. Instead, describe observed behaviour and classroom impact only.",
      safeAlternatives: [
        "Unsafe: 'I think he may have ADHD.'",
        "Safer: 'He sometimes finds it difficult to stay focused during longer tasks and benefits from clear step-by-step instructions.'",
        "Use observation-based wording instead.",
      ],
      actionLabel: "Rewrite with safer wording",
      variant: "diagnostic_speculation",
    }
  }

  return {
    title:
      tier === "tier3"
        ? "This wording needs to be revised"
        : "Please adjust the wording",
    message:
      tier === "tier3"
        ? "Please remove hateful or threatening language so the note stays parent-friendly."
        : "Please remove language that could be misinterpreted and keep the tone professional.",
    teacherNote: TEACHER_NOTES[tier],
    safeAlternatives: ALTERNATIVES,
    variant: "default",
  }
}
