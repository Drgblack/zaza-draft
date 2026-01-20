import type { Message } from "@/lib/ai/types"

const API_URL = "https://api.openai.com/v1/chat/completions"

function getApiKey() {
  return process.env.OPENAI_API_KEY
}

function resolveModels() {
  const primary = process.env.OPENAI_MODEL_PRIMARY ?? process.env.OPENAI_MODEL
  if (!primary) {
    throw new OpenAIClientError("Missing OpenAI model configuration (OPENAI_MODEL_PRIMARY or OPENAI_MODEL)")
  }

  return {
    primary,
    fallback: process.env.OPENAI_MODEL_FALLBACK ?? null,
  }
}

class OpenAIClientError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = "OpenAIClientError"
  }
}

function isTransientError(error: unknown) {
  if (error instanceof OpenAIClientError) {
    if (typeof error.status === "number") {
      return [429, 500, 502, 503, 504].includes(error.status)
    }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("network")
    )
  }
  return false
}

interface CallOptions {
  temperature?: number
  maxTokens?: number
  modelOverride?: string | null
}

interface CallResult {
  text: string
  tokensUsed?: number
  modelUsed: string
}

async function callModel(messages: Message[], model: string, options: CallOptions): Promise<CallResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new OpenAIClientError("Missing OpenAI API key (OPENAI_API_KEY)")
  }

  const payload = {
    model,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 400,
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  if (!response.ok) {
    let errorId: string | undefined
    try {
      const json = JSON.parse(text)
      errorId = json?.error?.code
    } catch {
      // ignore
    }
    throw new OpenAIClientError(
      `${response.status} ${response.statusText}`,
      response.status,
      errorId,
    )
  }

  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    throw new OpenAIClientError("OpenAI returned invalid JSON response")
  }

  const content = json?.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new OpenAIClientError("OpenAI returned empty response")
  }

  return {
    text: content,
    tokensUsed: json?.usage?.total_tokens,
    modelUsed: json?.model ?? model,
  }
}

export async function runChatWithFallback(messages: Message[], options: CallOptions = {}) {
  const { primary, fallback } = resolveModels()
  const attempts = [options.modelOverride ?? primary]

  if (fallback && fallback !== attempts[0]) {
    attempts.push(fallback)
  }

  let lastError: unknown
  for (const model of attempts) {
    try {
      return await callModel(messages, model, options)
    } catch (error) {
      lastError = error
      if (!isTransientError(error)) {
        break
      }
    }
  }

  if (lastError instanceof OpenAIClientError) {
    throw lastError
  }

  throw new OpenAIClientError("OpenAI request failed")
}
