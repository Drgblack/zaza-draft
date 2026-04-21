import {
  extractOpenAIRequestId,
  isOpenAIBusyError,
  isRetryableOpenAIError,
  OpenAIRequestError,
  toOpenAIRequestError,
  withOpenAIRetry,
} from "@/lib/ai/openai-retry"

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

export type ZaraLanguage = "en" | "de"

export function resolveZaraLanguage(locale?: string | null): ZaraLanguage {
  if (!locale) {
    return "en"
  }
  const normalized = locale.trim().replace(/_/g, "-").toLowerCase()
  if (normalized.startsWith("de")) {
    return "de"
  }
  return "en"
}

export function buildZaraSystemPrompt(locale?: string | null) {
  const language = resolveZaraLanguage(locale)
  const lines = [
    "You are Zara, a friendly, trustworthy teaching assistant for K-12 educators.",
    "Provide brief, practical advice that helps the teacher keep tone calm, supportive, and student-centered.",
    "Do not offer medical or legal claims, and avoid disallowed language.",
    "Limit the reply to two or three sentences and focus on next steps the teacher and family can take together.",
    "If the teacher's question is unclear, ask one clarifying question and wait for more detail.",
  ]

  if (language === "de") {
    lines.push("Antworten Sie auf Deutsch und verwenden Sie eine höfliche, kollegiale Ansprache (Sie-Form).")
  } else {
    lines.push("Respond in English and keep the tone collegial.")
  }

  return lines.join(" ")
}

interface FetchPayload {
  model: string
  temperature: number
  max_tokens: number
  messages: Array<{ role: "system" | "user"; content: string }>
}

async function queryOpenAI(payload: FetchPayload) {
  const openAiKey = process.env.OPENAI_API_KEY
  if (!openAiKey) {
    throw new OpenAIRequestError("Missing AI provider key (OPENAI_API_KEY)")
  }

  const json = await withOpenAIRetry(async () => {
    let response: Response
    try {
      response = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      throw toOpenAIRequestError(error, "AI request failed")
    }

    const text = await response.text()
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new OpenAIRequestError("AI provider returned invalid JSON")
    }

    if (!response.ok) {
      throw new OpenAIRequestError(
        parsed?.error?.message ?? response.statusText ?? "AI request failed",
        {
          status: response.status,
          code: parsed?.error?.code ?? parsed?.error?.type,
          requestId: extractOpenAIRequestId(response, parsed),
        },
      )
    }

    return parsed
  }, { context: "zara.chat" })

  const reply = json?.choices?.[0]?.message?.content?.trim()
  if (!reply) {
    throw new OpenAIRequestError("AI provider returned no reply")
  }

  return reply
}

export async function generateZaraReply(message: string, locale?: string | null) {
  const primaryModel = process.env.OPENAI_MODEL_PRIMARY ?? process.env.OPENAI_MODEL
  const fallbackModel = process.env.OPENAI_MODEL_FALLBACK
  const models = [primaryModel, fallbackModel].filter((model): model is string => Boolean(model))
  if (!models.length) {
    throw new OpenAIRequestError("Missing AI model configuration (OPENAI_MODEL_PRIMARY or OPENAI_MODEL)")
  }

  const systemPrompt = buildZaraSystemPrompt(locale)
  const payload: Omit<FetchPayload, "model"> = {
    temperature: 0.7,
    max_tokens: 250,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Teacher question: ${message}` },
    ],
  }

  let lastError: Error | null = null
  for (const model of models) {
    try {
      return await queryOpenAI({ ...payload, model })
    } catch (error) {
      lastError = error instanceof Error ? error : new OpenAIRequestError("AI request failed")
      if (isOpenAIBusyError(error) || !isRetryableOpenAIError(error)) {
        break
      }
    }
  }

  throw lastError ?? new OpenAIRequestError("AI request failed")
}
