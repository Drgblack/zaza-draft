import type { TeacherDraftIntent } from "@/lib/draft/intent-classification"

export type LengthComplexityBand = "minimal" | "standard" | "extended"

export interface LengthTarget {
  band: LengthComplexityBand
  minWords: number
  maxWords: number
  maxSentences: number
  rationale: string
}

function roundWordTarget(value: number) {
  return Math.max(1, Math.round(value))
}

export function calibrateLengthTarget(options: {
  sourceWordCount: number
  sourceSentenceCount: number
  intent: TeacherDraftIntent
  hasMultipleIssues: boolean
}): LengthTarget {
  const { sourceWordCount, sourceSentenceCount, intent, hasMultipleIssues } = options

  if (
    sourceWordCount <= 40 &&
    sourceSentenceCount <= 3 &&
    intent !== "escalate"
  ) {
    return {
      band: "minimal",
      minWords: roundWordTarget(sourceWordCount * 0.8),
      maxWords: roundWordTarget(sourceWordCount * 1.3),
      maxSentences: sourceSentenceCount + 1,
      rationale: "Short, simple source draft with limited complexity",
    }
  }

  if (
    sourceWordCount > 80 ||
    sourceSentenceCount > 5 ||
    hasMultipleIssues ||
    intent === "escalate"
  ) {
    return {
      band: "extended",
      minWords: roundWordTarget(sourceWordCount * 0.7),
      maxWords: roundWordTarget(sourceWordCount * 1.5),
      maxSentences: sourceSentenceCount + 3,
      rationale: "Longer or higher-stakes source draft requiring fuller coverage",
    }
  }

  return {
    band: "standard",
    minWords: roundWordTarget(sourceWordCount * 0.75),
    maxWords: roundWordTarget(sourceWordCount * 1.4),
    maxSentences: sourceSentenceCount + 2,
    rationale: "Moderate source complexity with one main issue to cover",
  }
}
