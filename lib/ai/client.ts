import type { Message } from "@/lib/ai/types"
import {
  extractOpenAIRequestId,
  isOpenAIBusyError,
  isRetryableOpenAIError,
  OpenAIRequestError,
  type OpenAIRetryEvent,
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
  instrumentation?: OpenAICallInstrumentation
}

interface CallResult {
  text: string
  tokensUsed?: number
  modelUsed: string
}

export interface OpenAICallStartEvent {
  step?: string
  model: string
  messageCount: number
  inputChars: number
  approxPromptTokens: number
  largestMessageChars: number
  tokenHeavy: boolean
  maxTokens: number
  temperature: number
  topP: number
  seedEnabled: boolean
}

export interface OpenAICallRetryEvent extends OpenAIRetryEvent {
  step?: string
  model: string
}

export interface OpenAICallEndEvent {
  step?: string
  model: string
  modelUsed: string
  status: "ok" | "error"
  elapsedMs: number
  tokensUsed?: number
  retryTriggered: boolean
  retryCount: number
  openAiRequestId?: string | null
}

export interface OpenAICallInstrumentation {
  step?: string
  onCallStart?: (event: OpenAICallStartEvent) => void
  onRetry?: (event: OpenAICallRetryEvent) => void
  onCallEnd?: (event: OpenAICallEndEvent) => void
}

function approximateTokensFromChars(charCount: number) {
  return Math.ceil(charCount / 4)
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
  const inputChars = payload.messages.reduce(
    (total, message) => total + String(message.content ?? "").length,
    0,
  )
  const largestMessageChars = payload.messages.reduce(
    (largest, message) => Math.max(largest, String(message.content ?? "").length),
    0,
  )
  const approxPromptTokens = approximateTokensFromChars(inputChars)
  const tokenHeavy = approxPromptTokens >= 1500 || largestMessageChars >= 6000
  const callStartedAt = Date.now()
  let retryCount = 0

  options.instrumentation?.onCallStart?.({
    step: options.instrumentation.step,
    model,
    messageCount: payload.messages.length,
    inputChars,
    approxPromptTokens,
    largestMessageChars,
    tokenHeavy,
    maxTokens: payload.max_tokens,
    temperature: payload.temperature,
    topP: payload.top_p,
    seedEnabled: Object.prototype.hasOwnProperty.call(payload, "seed"),
  })

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

  try {
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
    }, {
      context: "chat.completions",
      onRetry: (event) => {
        retryCount = event.retryAttempt
        options.instrumentation?.onRetry?.({
          ...event,
          step: options.instrumentation?.step,
          model,
        })
      },
    })

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

    const tokensUsed = json?.usage?.total_tokens
    const modelUsed = json?.model ?? model
    options.instrumentation?.onCallEnd?.({
      step: options.instrumentation?.step,
      model,
      modelUsed,
      status: "ok",
      elapsedMs: Date.now() - callStartedAt,
      tokensUsed,
      retryTriggered: retryCount > 0,
      retryCount,
      openAiRequestId: extractOpenAIRequestId(response, json),
    })

    return {
      text: content,
      tokensUsed,
      modelUsed,
    }
  } catch (error) {
    const normalizedError = toOpenAIRequestError(error)
    options.instrumentation?.onCallEnd?.({
      step: options.instrumentation?.step,
      model,
      modelUsed: model,
      status: "error",
      elapsedMs: Date.now() - callStartedAt,
      retryTriggered: retryCount > 0,
      retryCount,
      openAiRequestId: normalizedError.requestId ?? null,
    })
    throw normalizedError
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
