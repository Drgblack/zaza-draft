import type { Message } from "@/lib/ai/types"

const API_URL = "https://api.openai.com/v1/chat/completions"
const DEFAULT_GENERATION_SEED = 23

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
  topP?: number
  maxTokens?: number
  seed?: number
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

  const envSeed = process.env.OPENAI_GENERATION_SEED?.trim()
  const resolvedSeed =
    options.seed ??
    (envSeed && envSeed.toLowerCase() !== "off" && envSeed.toLowerCase() !== "none"
      ? Number(envSeed)
      : DEFAULT_GENERATION_SEED)
  const payload = {
    model,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    temperature: options.temperature ?? 0.2,
    top_p: options.topP ?? 0.1,
    max_tokens: options.maxTokens ?? 400,
    ...(Number.isFinite(resolvedSeed) ? { seed: resolvedSeed } : {}),
  }

  const requestOnce = async (requestPayload: Record<string, unknown>) => {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    })
    const text = await response.text()
    return { response, text }
  }

  let { response, text } = await requestOnce(payload)
  if (!response.ok) {
    let errorId: string | undefined
    let errorMessage = ""
    try {
      const json = JSON.parse(text)
      errorId = json?.error?.code
      errorMessage = String(json?.error?.message ?? "").toLowerCase()
    } catch {
      // ignore
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "seed") &&
      response.status === 400 &&
      (errorId === "unsupported_parameter" || errorMessage.includes("seed"))
    ) {
      const payloadWithoutSeed = { ...payload }
      delete (payloadWithoutSeed as { seed?: number }).seed
      ;({ response, text } = await requestOnce(payloadWithoutSeed))
    }
  }

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
