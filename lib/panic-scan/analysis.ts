import { runChatWithFallback } from "@/lib/ai/client"
import type { Message } from "@/lib/ai/types"
import type { MessageClassification, PanicScanAnalysis } from "./types"

const SYSTEM_PROMPT = `
You are a safety-first assistant tasked with analyzing emotionally intense teacher messages for Zaza Draft.
Return exactly one JSON object with two keys: "classification" and "analysis".
The classification object must include: messageType, emotionalTone, riskLevel, urgency, and confidenceScore (0-100).
The analysis object must include: summary, emotionalInterpretation, professionalRisk, likelyMeaning, and suggestedResponse.
Use only the allowed values for each field. Do not include extra text outside the JSON object.
`

function extractJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error("Unable to parse analysis response")
  }
  return JSON.parse(match[0])
}

export async function analyzePanicMessage(message: string): Promise<{
  classification: MessageClassification
  analysis: PanicScanAnalysis
}> {
  const messages: Message[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Review the message below and return the JSON structure only:\n\n"""${message}"""`,
    },
  ]

  const result = await runChatWithFallback(messages, { temperature: 0.0, maxTokens: 500 })
  const body = extractJsonObject(result.text)

  if (!body.classification || !body.analysis) {
    throw new Error("Unexpected analysis payload")
  }

  return {
    classification: body.classification as MessageClassification,
    analysis: body.analysis as PanicScanAnalysis,
  }
}
