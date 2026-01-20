import type { EmotionAnalysis, PrimaryEmotion } from "./types"

const NEGATIVE_WORDS = [
  "angry",
  "frustrated",
  "upset",
  "annoyed",
  "disappointed",
  "infuriated",
  "resentful",
  "irritated",
  "mad",
  "unfair",
]

const INTENSIFIERS = ["very", "really", "so", "seriously", "terribly", "extremely"]
const URGENCY_WORDS = ["urgent", "asap", "now", "immediately", "right away", "today"]
const DEFENSIVE_PHRASES = ["I didn't", "I don't", "that was", "that's not", "you should", "you always"]

const EMOTION_KEYWORDS: Record<PrimaryEmotion, string[]> = {
  frustrated: ["frustrated", "overwhelmed", "stressed", "exasperated"],
  angry: ["angry", "furious", "livid", "outraged"],
  anxious: ["anxious", "nervous", "worried", "panicked"],
  neutral: [],
}

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max)

function countMatches(text: string, targets: string[]) {
  const lower = text.toLowerCase()
  return targets.reduce((count, target) => {
    const pattern = new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
    const matches = lower.match(pattern)
    return count + (matches?.length ?? 0)
  }, 0)
}

function countUppercaseWords(text: string) {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 1 && word === word.toUpperCase())
    .length
}

function derivePrimaryEmotion(text: string): PrimaryEmotion {
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    if (keywords.some((keyword) => text.toLowerCase().includes(keyword))) {
      return emotion as PrimaryEmotion
    }
  }
  return "neutral"
}

export function analyzeVoiceEmotion(text: string): EmotionAnalysis {
  const negativityMatches = countMatches(text, NEGATIVE_WORDS)
  const intensifierMatches = countMatches(text, INTENSIFIERS)
  const urgencyMatches = countMatches(text, URGENCY_WORDS)
  const defensiveMatches = DEFENSIVE_PHRASES.reduce(
    (count, phrase) => (text.toLowerCase().includes(phrase) ? count + 1 : count),
    0,
  )

  const exclamationCount = (text.match(/!/g) ?? []).length
  const uppercaseCount = countUppercaseWords(text)

  const baseFrustration = negativityMatches * 12
  const intensityModifier = intensifierMatches * 4 + exclamationCount * 3 + uppercaseCount * 2
  const frustrationScore = clamp(baseFrustration + intensityModifier)

  const urgencyScore = clamp((urgencyMatches * 15 + exclamationCount * 2) * 1.1)
  const defensivenessScore = clamp(defensiveMatches * 20 + uppercaseCount * 2)

  const detectedNegativity = negativityMatches > 0 || exclamationCount > 2
  const primaryEmotion = derivePrimaryEmotion(text)

  return {
    frustrationScore,
    urgencyScore,
    defensivenessScore,
    primaryEmotion,
    detectedNegativity,
  }
}
