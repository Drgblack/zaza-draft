export type PrimaryEmotion = "frustrated" | "angry" | "anxious" | "neutral"

export interface EmotionAnalysis {
  frustrationScore: number
  urgencyScore: number
  defensivenessScore: number
  primaryEmotion: PrimaryEmotion
  detectedNegativity: boolean
}
