import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  OPENAI_BUSY_MESSAGE,
  OpenAIRequestError,
  withOpenAIRetry,
} from "@/lib/ai/openai-retry"

describe("withOpenAIRetry", () => {
  let warnSpy: any

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    warnSpy.mockRestore()
  })

  it("retries 429 responses three times with exponential backoff and then throws a busy error", async () => {
    vi.useFakeTimers()
    const operation = vi.fn().mockRejectedValue(
      new OpenAIRequestError("429 Too Many Requests", {
        status: 429,
        requestId: "req_123",
      }),
    )

    const promise = withOpenAIRetry(operation, { context: "panic-scan.analysis" }).then(
      () => {
        throw new Error("Expected retry exhaustion")
      },
      (error) => error,
    )

    await vi.runAllTimersAsync()

    await expect(promise).resolves.toMatchObject({
      message: OPENAI_BUSY_MESSAGE,
      retryExhausted: true,
      requestId: "req_123",
    })
    expect(operation).toHaveBeenCalledTimes(4)
    expect(warnSpy).toHaveBeenCalledTimes(3)
    expect(warnSpy).toHaveBeenNthCalledWith(
      1,
      "[openai] retrying request",
      expect.objectContaining({
        context: "panic-scan.analysis",
        requestId: "req_123",
        retryAttempt: 1,
      }),
    )
    expect(warnSpy).toHaveBeenNthCalledWith(
      2,
      "[openai] retrying request",
      expect.objectContaining({
        retryAttempt: 2,
      }),
    )
    expect(warnSpy).toHaveBeenNthCalledWith(
      3,
      "[openai] retrying request",
      expect.objectContaining({
        retryAttempt: 3,
      }),
    )
  })

  it("does not retry 400 responses", async () => {
    const operation = vi.fn().mockRejectedValue(
      new OpenAIRequestError("400 Bad Request", {
        status: 400,
        requestId: "req_400",
      }),
    )

    await expect(withOpenAIRetry(operation)).rejects.toMatchObject({
      message: "400 Bad Request",
      status: 400,
      requestId: "req_400",
    })
    expect(operation).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("retries timeout errors and returns the later success result", async () => {
    vi.useFakeTimers()
    const timeoutError = new OpenAIRequestError("Network timeout")
    const operation = vi
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValue("ok")

    const promise = withOpenAIRetry(operation, { context: "zara.chat" })

    await vi.advanceTimersByTimeAsync(3000)

    await expect(promise).resolves.toBe("ok")
    expect(operation).toHaveBeenCalledTimes(3)
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })
})
