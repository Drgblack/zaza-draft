import type { Message } from "@/lib/ai/types"
import {
  extractOpenAIRequestId,
  isOpenAIBusyError,
  isRetryableOpenAIError,
  OpenAIRequestError,
  toOpenAIRequestError,
  withOpenAIRetry,
} from "@/lib/ai/openai-retry"

const API_URL = "https://api.openai.com/v1/chat/completions"
const DEFAULT_GENERATION_SEED = 23

function getApiKey() {
  return process.env.OPENAI_API_KEY
}

function resolveModels() {
  const primary = process.env.OPENAI_MODEL_PRIMARY ?? process.env.OPENAI_MODEL
  if (!primary) {
    throw new OpenAIRequestError(
      "Missing OpenAI model configuration (OPENAI_MODEL_PRIMARY or OPENAI_MODEL)",
    )
  }

  return {
    primary,
    fallback: process.env.OPENAI_MODEL_FALLBACK ?? null,
  }
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
    throw new OpenAIRequestError("Missing OpenAI API key (OPENAI_API_KEY)")
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
    let response: Response
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      })
    } catch (error) {
      throw toOpenAIRequestError(error)
    }
    const text = await response.text()
    return { response, text }
  }

  const { response, text } = await withOpenAIRetry(async () => {
    let currentPayload = payload
    let currentResponse = await requestOnce(currentPayload)

    if (!currentResponse.response.ok) {
      let errorId: string | undefined
      let errorMessage = ""
      try {
        const json = JSON.parse(currentResponse.text)
        errorId = json?.error?.code
        errorMessage = String(json?.error?.message ?? "").toLowerCase()
      } catch {
        // ignore
      }

      if (
        Object.prototype.hasOwnProperty.call(currentPayload, "seed") &&
        currentResponse.response.status === 400 &&
        (errorId === "unsupported_parameter" || errorMessage.includes("seed"))
      ) {
        currentPayload = { ...currentPayload }
        delete (currentPayload as { seed?: number }).seed
        currentResponse = await requestOnce(currentPayload)
      }
    }

    if (!currentResponse.response.ok) {
      let json: any
      try {
        json = JSON.parse(currentResponse.text)
      } catch {
        json = null
      }
      throw new OpenAIRequestError(`${currentResponse.response.status} ${currentResponse.response.statusText}`, {
        status: currentResponse.response.status,
        code: json?.error?.code,
        requestId: extractOpenAIRequestId(currentResponse.response, json),
      })
    }

    return currentResponse
  }, { context: "chat.completions" })

  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    throw new OpenAIRequestError("OpenAI returned invalid JSON response")
  }

  const content = json?.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new OpenAIRequestError("OpenAI returned empty response")
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
      if (isOpenAIBusyError(error) || !isRetryableOpenAIError(error)) {
        break
      }
    }
  }

  if (lastError instanceof OpenAIRequestError) {
    throw lastError
  }

  throw new OpenAIRequestError("OpenAI request failed")
}
