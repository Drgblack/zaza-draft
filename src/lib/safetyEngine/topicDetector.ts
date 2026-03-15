export type TopicSensitivity = "high" | "medium" | "low"

const topicRules = {
  high: [
    "fight",
    "hit",
    "aggression",
    "aggressive",
    "bullying",
    "bully",
    "excluded",
    "exclusion",
    "safeguarding",
    "attendance",
    "absent",
    "ADHD",
    "SEN",
    "learning difficulty",
    "failed",
    "failing",
    "suspended",
    "suspension",
    "incident",
  ],
  medium: [
    "homework",
    "disruptive",
    "disruption",
    "late",
    "missing equipment",
    "behaviour",
    "distraction",
    "unfocused",
  ],
} as const

function includesKeyword(rawMessage: string, keyword: string): boolean {
  return rawMessage.toLowerCase().includes(keyword.toLowerCase())
}

export function detectTopicKeyword(rawMessage: string): string | null {
  const highMatch = topicRules.high.find((keyword) => includesKeyword(rawMessage, keyword))

  if (highMatch) {
    return highMatch
  }

  const mediumMatch = topicRules.medium.find((keyword) => includesKeyword(rawMessage, keyword))

  return mediumMatch ?? null
}

export function detectTopicSensitivity(rawMessage: string): TopicSensitivity {
  if (topicRules.high.some((keyword) => includesKeyword(rawMessage, keyword))) {
    return "high"
  }

  if (topicRules.medium.some((keyword) => includesKeyword(rawMessage, keyword))) {
    return "medium"
  }

  return "low"
}
