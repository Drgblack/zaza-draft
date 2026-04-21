const OPENAI_RETRY_DELAYS_MS = [1000, 2000, 4000] as const

export const OPENAI_BUSY_MESSAGE =
  "Analysis is temporarily busy. Please try again in a few seconds."

export class OpenAIRequestError extends Error {
  status?: number
  code?: string
  requestId?: string | null
  retryExhausted: boolean
  userMessage?: string

  constructor(
    message: string,
    options: {
      status?: number
      code?: string
      requestId?: string | null
      retryExhausted?: boolean
      userMessage?: string
    } = {},
  ) {
    super(message)
    this.name = "OpenAIRequestError"
    this.status = options.status
    this.code = options.code
    this.requestId = options.requestId
    this.retryExhausted = options.retryExhausted ?? false
    this.userMessage = options.userMessage
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTimeoutLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    error.name === "AbortError" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("etimedout")
  )
}

export function extractOpenAIRequestId(response: Response, payload?: any) {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("request-id") ??
    payload?.error?.request_id ??
    payload?.request_id ??
    null
  )
}

export function toOpenAIRequestError(error: unknown, fallbackMessage = "OpenAI request failed") {
  if (error instanceof OpenAIRequestError) {
    return error
  }

  return new OpenAIRequestError(error instanceof Error ? error.message : fallbackMessage, {
    code: error instanceof Error ? error.name : undefined,
  })
}

export function isRetryableOpenAIError(error: unknown) {
  if (error instanceof OpenAIRequestError) {
    return error.status === 429 || isTimeoutLikeError(error)
  }

  return isTimeoutLikeError(error)
}

export function isOpenAIBusyError(error: unknown) {
  return (
    error instanceof OpenAIRequestError &&
    error.retryExhausted &&
    error.userMessage === OPENAI_BUSY_MESSAGE
  )
}

export async function withOpenAIRetry<T>(
  operation: () => Promise<T>,
  options: {
    context?: string
  } = {},
): Promise<T> {
  let lastError: OpenAIRequestError | null = null

  for (let attemptIndex = 0; attemptIndex <= OPENAI_RETRY_DELAYS_MS.length; attemptIndex += 1) {
    try {
      return await operation()
    } catch (error) {
      const normalizedError = toOpenAIRequestError(error)
      lastError = normalizedError

      if (!isRetryableOpenAIError(normalizedError)) {
        throw normalizedError
      }

      if (attemptIndex === OPENAI_RETRY_DELAYS_MS.length) {
        throw new OpenAIRequestError(OPENAI_BUSY_MESSAGE, {
          status: normalizedError.status,
          code: normalizedError.code,
          requestId: normalizedError.requestId,
          retryExhausted: true,
          userMessage: OPENAI_BUSY_MESSAGE,
        })
      }

      console.warn("[openai] retrying request", {
        context: options.context ?? "openai",
        requestId: normalizedError.requestId ?? null,
        retryAttempt: attemptIndex + 1,
      })
      await delay(OPENAI_RETRY_DELAYS_MS[attemptIndex])
    }
  }

  throw lastError ?? new OpenAIRequestError("OpenAI request failed")
}
