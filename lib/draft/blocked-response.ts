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

export interface BlockedLanguageResponse {
  message: string
  teacherNote: string
  safeAlternatives: string[]
}

export function buildBlockedLanguageResponse(tier: BlockedLanguageTier): BlockedLanguageResponse {
  return {
    message:
      tier === "tier3"
        ? "Please remove hateful or threatening language so the note stays parent-friendly."
        : "Please remove language that could be misinterpreted and keep the tone professional.",
    teacherNote: TEACHER_NOTES[tier],
    safeAlternatives: ALTERNATIVES,
  }
}
