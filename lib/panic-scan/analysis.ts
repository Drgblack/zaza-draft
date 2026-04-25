import {
  runChatWithFallback,
  type OpenAICallInstrumentation,
} from "@/lib/ai/client"
import type { Message } from "@/lib/ai/types"
import type { LanguageKey } from "@/lib/draft/fallback"
import type { EmotionalTone, MessageClassification, MessageType, PanicScanAnalysis } from "./types"

function buildSystemPrompt(language: LanguageKey) {
  const languageName = language === "de" ? "German" : "English"
  return `
You are a safety-first assistant tasked with analyzing emotionally intense teacher messages for Zaza Draft.
Return exactly one JSON object with two keys: "classification" and "analysis".

CRITICAL LANGUAGE RULE:
- Write ALL analysis field values (summary, emotionalInterpretation, professionalRisk, likelyMeaning, suggestedResponse) in ${languageName} only.
- The target analysis language comes from the app locale when provided; do not override it because the screenshot text looks like another language.
- Do NOT mix languages.
The classification object must include: messageType, emotionalTone, riskLevel, urgency, and confidenceScore (0-100).
The analysis object must include: summary, emotionalInterpretation, professionalRisk, likelyMeaning, and suggestedResponse.
Use only the allowed values for each field. Do not include extra text outside the JSON object.
`
}

function extractJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error("Unable to parse analysis response")
  }
  return JSON.parse(match[0])
}

export async function analyzePanicMessage(
  message: string,
  language: LanguageKey,
  instrumentation?: OpenAICallInstrumentation,
): Promise<{
  classification: MessageClassification
  analysis: PanicScanAnalysis
}> {
  const messages: Message[] = [
    {
      role: "system",
      content: buildSystemPrompt(language),
    },
    {
      role: "user",
      content: `Review the message below and return the JSON structure only:\n\n"""${message}"""`,
    },
  ]

  const result = await runChatWithFallback(messages, {
    temperature: 0.0,
    maxTokens: 500,
    instrumentation,
  })
  const body = extractJsonObject(result.text)

  if (!body.classification || !body.analysis) {
    throw new Error("Unexpected analysis payload")
  }

  return {
    classification: body.classification as MessageClassification,
    analysis: body.analysis as PanicScanAnalysis,
  }
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern))
}

function detectMessageType(text: string): MessageType {
  if (
    includesAny(text, [
      "headteacher",
      "principal",
      "safeguarding",
      "ofsted",
      "district",
      "board of governors",
      "formal complaint",
      "legal",
      "lawyer",
    ])
  ) {
    return "official_notice"
  }

  if (
    includesAny(text, [
      "colleague",
      "coworker",
      "team member",
      "department",
      "another teacher",
      "member of staff",
    ])
  ) {
    return "colleague_conflict"
  }

  if (
    includesAny(text, [
      "admin",
      "administrator",
      "leadership",
      "line manager",
      "assistant head",
      "deputy head",
    ])
  ) {
    return "admin_feedback"
  }

  if (
    includesAny(text, [
      "urgent",
      "asap",
      "immediately",
      "right away",
      "today",
      "before tomorrow",
      "call me",
      "please call",
    ])
  ) {
    return "urgent_request"
  }

  if (
    includesAny(text, [
      "my child",
      "my son",
      "my daughter",
      "student",
      "bullying",
      "upset",
      "worried",
      "anxious",
      "crying",
      "support",
      "unsafe",
    ])
  ) {
    return "student_concern"
  }

  if (
    includesAny(text, [
      "unacceptable",
      "concern",
      "concerned",
      "complaint",
      "frustrated",
      "angry",
      "upset",
      "confused",
      "explain what happened",
      "what happened",
    ])
  ) {
    return "parent_complaint"
  }

  return "general_inquiry"
}

function detectEmotionalTone(text: string): EmotionalTone {
  if (
    includesAny(text, [
      "furious",
      "angry",
      "outraged",
      "disgusted",
      "shocked",
      "unacceptable",
      "ridiculous",
      "appalling",
    ])
  ) {
    return "angry"
  }

  if (
    includesAny(text, [
      "once again",
      "as usual",
      "interesting that",
      "clearly nobody",
      "apparently",
    ])
  ) {
    return "passive_aggressive"
  }

  if (
    includesAny(text, [
      "must",
      "need you to",
      "i expect",
      "asap",
      "immediately",
      "right away",
      "demand",
    ])
  ) {
    return "demanding"
  }

  if (
    includesAny(text, [
      "worried",
      "concerned",
      "anxious",
      "confused",
      "upset",
      "overwhelmed",
      "nervous",
    ])
  ) {
    return "anxious"
  }

  if (
    includesAny(text, [
      "frustrated",
      "fed up",
      "disappointed",
      "again",
      "still",
    ])
  ) {
    return "frustrated"
  }

  if (
    includesAny(text, [
      "thank you",
      "appreciate",
      "grateful",
      "support",
      "helpful",
    ])
  ) {
    return "supportive"
  }

  return "neutral"
}

function detectRiskLevel(text: string, messageType: MessageType, tone: EmotionalTone) {
  if (
    messageType === "official_notice" ||
    includesAny(text, [
      "safeguarding",
      "unsafe",
      "injured",
      "pushed",
      "hit",
      "hurt",
      "bullying",
      "discrimination",
      "formal complaint",
      "lawyer",
      "legal",
      "headteacher",
      "principal",
    ])
  ) {
    return "high" as const
  }

  if (
    tone === "angry" ||
    tone === "demanding" ||
    tone === "passive_aggressive" ||
    messageType === "urgent_request" ||
    messageType === "parent_complaint"
  ) {
    return "medium" as const
  }

  return "low" as const
}

function detectUrgency(text: string, messageType: MessageType) {
  if (
    messageType === "urgent_request" ||
    includesAny(text, [
      "urgent",
      "asap",
      "immediately",
      "right away",
      "today",
      "before tomorrow",
      "now",
    ])
  ) {
    return "high" as const
  }

  if (
    includesAny(text, [
      "tomorrow",
      "soon",
      "this week",
      "please explain",
      "meeting",
      "call me",
      "please call",
    ])
  ) {
    return "medium" as const
  }

  return "low" as const
}

function estimateConfidence(
  messageType: MessageType,
  tone: EmotionalTone,
  riskLevel: "low" | "medium" | "high",
  urgency: "low" | "medium" | "high",
  text: string,
) {
  let score = 58
  if (messageType !== "general_inquiry") score += 8
  if (tone !== "neutral") score += 8
  if (riskLevel !== "low") score += 7
  if (urgency !== "low") score += 6
  if (text.length >= 250) score += 6
  return Math.min(score, 92)
}

function suggestedResponseFor(
  messageType: MessageType,
  riskLevel: "low" | "medium" | "high",
  urgency: "low" | "medium" | "high",
) {
  if (riskLevel === "high") {
    return "escalate_to_admin" as const
  }

  if (urgency === "high") {
    return "provide_info" as const
  }

  if (messageType === "student_concern" || messageType === "parent_complaint") {
    return "acknowledge_concern" as const
  }

  if (messageType === "colleague_conflict") {
    return "schedule_meeting" as const
  }

  return "provide_info" as const
}

function buildLocalizedAnalysis(
  language: LanguageKey,
  messageType: MessageType,
  tone: EmotionalTone,
  riskLevel: "low" | "medium" | "high",
  urgency: "low" | "medium" | "high",
): PanicScanAnalysis {
  if (language === "de") {
    const summaryMap: Record<MessageType, string> = {
      parent_complaint: "Die Nachricht wirkt wie eine elterliche Beschwerde zu einem schulischen Vorfall oder Ablauf.",
      student_concern: "Die Nachricht beschreibt vor allem eine Sorge um das Wohlbefinden oder die Unterstützung des Kindes.",
      admin_feedback: "Die Nachricht wirkt wie Rückmeldung oder Kritik mit schulisch-administrativem Bezug.",
      colleague_conflict: "Die Nachricht deutet auf einen Konflikt oder Spannungen mit einer anderen erwachsenen Person im schulischen Kontext hin.",
      official_notice: "Die Nachricht enthält Hinweise auf formelle oder eskalierte Schritte.",
      urgent_request: "Die Nachricht fordert eine schnelle Rückmeldung oder unmittelbares Handeln ein.",
      general_inquiry: "Die Nachricht wirkt wie eine allgemeine Nachfrage mit Klärungsbedarf.",
    }
    const interpretationMap: Record<EmotionalTone, string> = {
      angry: "Der Ton wirkt deutlich verärgert und wenig belastbar für weitere Reibung.",
      frustrated: "Der Ton wirkt frustriert und signalisiert, dass das Vertrauen bereits angespannt ist.",
      passive_aggressive: "Der Ton wirkt indirekt vorwurfsvoll und kann eine defensive Reaktion auslösen.",
      demanding: "Der Ton wirkt fordernd und erwartet eine klare, zügige Reaktion.",
      anxious: "Der Ton wirkt besorgt und sucht vor allem Klarheit und Sicherheit.",
      neutral: "Der Ton wirkt überwiegend sachlich, aber mit erkennbarem Klärungsbedarf.",
      supportive: "Der Ton wirkt kooperativ und offen für eine konstruktive Rückmeldung.",
    }
    const riskText =
      riskLevel === "high"
        ? "Hohes professionelles Risiko: Die Nachricht hat klares Eskalationspotenzial und sollte sorgfältig sowie gegebenenfalls mit Leitungseinbindung beantwortet werden."
        : riskLevel === "medium"
        ? "Mittleres professionelles Risiko: Eine knappe oder defensive Antwort könnte die Lage verschärfen."
        : "Geringes professionelles Risiko: Eine ruhige, klare und professionelle Antwort dürfte ausreichen."
    const likelyMeaning =
      urgency === "high"
        ? "Die absendende Person erwartet eine schnelle Klärung, sichtbare nächste Schritte und Verlässlichkeit."
        : messageType === "student_concern"
        ? "Die absendende Person möchte verstehen, was passiert ist, und erwartet Unterstützung sowie einen ruhigen Plan."
        : "Die absendende Person möchte vor allem Klarheit, Einordnung und eine professionelle Rückmeldung zum weiteren Vorgehen."

    return {
      summary: summaryMap[messageType],
      emotionalInterpretation: interpretationMap[tone],
      professionalRisk: riskText,
      likelyMeaning,
      suggestedResponse: suggestedResponseFor(messageType, riskLevel, urgency),
    }
  }

  const summaryMap: Record<MessageType, string> = {
    parent_complaint: "The message reads like a parent complaint about a classroom issue or school response.",
    student_concern: "The message is mainly expressing concern about the child's wellbeing, treatment, or support.",
    admin_feedback: "The message appears to be feedback or criticism with an administrative angle.",
    colleague_conflict: "The message suggests tension or conflict involving another adult in the school context.",
    official_notice: "The message includes signs of a formal or escalated complaint path.",
    urgent_request: "The message is asking for a quick response or immediate action.",
    general_inquiry: "The message reads like a general inquiry that still needs a clear answer.",
  }
  const interpretationMap: Record<EmotionalTone, string> = {
    angry: "The tone is openly angry and likely to react badly to anything defensive or vague.",
    frustrated: "The tone suggests frustration and reduced trust in the current handling.",
    passive_aggressive: "The tone is indirectly critical and could trigger defensiveness if the reply is not carefully framed.",
    demanding: "The tone is forceful and expects a clear, prompt response.",
    anxious: "The tone sounds worried and mainly wants clarity, reassurance, and a plan.",
    neutral: "The tone is mostly factual, but it still signals a need for clarification.",
    supportive: "The tone is cooperative and leaves room for a constructive response.",
  }
  const riskText =
    riskLevel === "high"
      ? "High professional risk: the message shows clear escalation potential and may need leadership awareness."
      : riskLevel === "medium"
      ? "Medium professional risk: a brief or defensive reply could easily worsen the exchange."
      : "Low professional risk: a calm, clear, professional reply should usually be enough."
  const likelyMeaning =
    urgency === "high"
      ? "The sender wants fast clarification, visible next steps, and confidence that the issue is being handled."
      : messageType === "student_concern"
      ? "The sender wants to understand what happened and how the child will be supported next."
      : "The sender mainly wants clarity, acknowledgement, and a professional explanation of next steps."

  return {
    summary: summaryMap[messageType],
    emotionalInterpretation: interpretationMap[tone],
    professionalRisk: riskText,
    likelyMeaning,
    suggestedResponse: suggestedResponseFor(messageType, riskLevel, urgency),
  }
}

export function buildHeuristicPanicAnalysis(
  message: string,
  language: LanguageKey,
): {
  classification: MessageClassification
  analysis: PanicScanAnalysis
} {
  const normalized = message.toLowerCase()
  const messageType = detectMessageType(normalized)
  const emotionalTone = detectEmotionalTone(normalized)
  const riskLevel = detectRiskLevel(normalized, messageType, emotionalTone)
  const urgency = detectUrgency(normalized, messageType)
  const confidenceScore = estimateConfidence(
    messageType,
    emotionalTone,
    riskLevel,
    urgency,
    normalized,
  )

  return {
    classification: {
      messageType,
      emotionalTone,
      riskLevel,
      urgency,
      confidenceScore,
    },
    analysis: buildLocalizedAnalysis(
      language,
      messageType,
      emotionalTone,
      riskLevel,
      urgency,
    ),
  }
}

