export const TONE_DESCRIPTIONS = {
  warm: "Encouraging and positive, builds confidence and motivation",
  professional: "Clear and balanced, maintains appropriate boundaries",
  direct: "Straightforward and specific, focused on key points",
  empathetic: "Understanding and supportive, acknowledges challenges"
} as const;

export const SAFEGUARD_DESCRIPTIONS = {
  privacy: "Maintains student privacy by avoiding specific personal details",
  "tone-check": "Ensures communication remains constructive and respectful",
  "de-escalation": "Uses language that helps reduce tension or anxiety",
  "bias-check": "Avoids assumptions and maintains inclusive language",
  "no-diagnosis": "Focuses on observations without medical/clinical claims"
} as const;

export const ERROR_MESSAGES = {
  default: "Something went wrong. Please try again.",
  badRequest: "Unable to process your request. Please check your input and try again.",
  openai: "We're having trouble generating your draft. Please try again in a moment.",
  validation: "The generated draft didn't meet our quality standards. Please try again.",
  network: "Network connection issue. Please check your connection and try again."
} as const;


