import type { DraftLanguage, DraftTone } from "@/lib/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"

interface ProviderInput {
  situation: string
  tone: DraftTone
  language: DraftLanguage
    context?: {
      subject?: string
      gradeLevel?: string
    }
  rewrite?: boolean
  previousDraft?: string
}

export interface ProviderMeta {
  modelUsed: string
  tokensUsed?: number
  latencyMs: number
}

export interface ProviderResult {
  text: string
  providerMeta: ProviderMeta
}

class ProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderError"
  }
}

function buildSystemPrompt(tone: DraftTone, language: DraftLanguage, rewrite?: boolean) {
  const systemLines = [
    "You are Zara Draft, an assistant for K-12 teachers who writes professional, concise communications for parents and colleagues.",
    "Always stay factual: do not invent facts that were not provided in the prompt. When details are missing, keep the response neutral and ask for clarification.",
    "Maintain the requested tone and output the final text in the requested language. Keep replies ≤250 words, focused on teacher style.",
    "Never include student PII (full names, emails, phone numbers, addresses). If the prompt is disallowed, explain politely that you cannot help.",
  ]

  if (rewrite) {
    systemLines.push("You are rewriting content already supplied; keep meaning intact while adapting tone/language per the request.")
  }

  return systemLines.join(" ")
}

export async function generateDraft(input: ProviderInput): Promise<ProviderResult> {
  if (!OPENAI_API_KEY) {
    throw new ProviderError("Missing AI provider key (OPENAI_API_KEY)")
  }

  const system = buildSystemPrompt(input.tone, input.language, input.rewrite)
  const contextLines = [
    `Tone: ${input.tone}`,
    `Language: ${input.language}`,
    `Context subject: ${input.context?.subject ?? "—"}`,
    `Context gradeLevel: ${input.context?.gradeLevel ?? "—"}`,
  ]
  const userParts = [
    `Situation:\n${input.situation}`,
    input.rewrite && input.previousDraft ? `Rewrite previous draft:\n${input.previousDraft}` : undefined,
  ].filter(Boolean)

  const payload = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${contextLines.join("\n")} \n\n${userParts.join("\n\n")}` },
    ],
    temperature: 0.4,
    max_tokens: 500,
  }

  const start = Date.now()
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const latencyMs = Date.now() - start

  if (!response.ok) {
    const errorBody = await response.text()
    throw new ProviderError(
      `AI_GENERATION_FAILED: ${response.status} ${response.statusText} - ${errorBody}`,
    )
  }

  const json = await response.json()
  const result = json.choices?.[0]?.message?.content?.trim()

  if (!result || result.length === 0) {
    throw new ProviderError("AI_GENERATION_FAILED: No content returned")
  }

  const tokensUsed = json.usage?.total_tokens
  return {
    text: result,
    providerMeta: {
      modelUsed: json.model ?? OPENAI_MODEL,
      tokensUsed,
      latencyMs,
    },
  }
}
