// app/api/draft/generate/retry.test.ts
import { describe, it, expect, vi } from "vitest";
import { withRetry, TimeoutError } from "./retry";

describe("withRetry", () => {
  it("retries and eventually succeeds (fast, no real waits)", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    let count = 0;
    const promise = withRetry(async () => {
      count++;
      if (count < 3) throw new Error("Persistent error");
      return "ok";
    }, { attempts: 3, base: 1000, factor: 1.5, jitter: false /* deterministic */, /* no logger */ });

    // Advance time to cover the backoffs: 1000ms, then 1500ms
    await vi.advanceTimersByTimeAsync(1000 + 1500);
    await expect(promise).resolves.toBe("ok");
    expect(count).toBe(3);

    // No logs because we didn't pass a logger and DEBUG_RETRY is not set in tests
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
    vi.useRealTimers();
  });

  it("does not retry on 4xx-like errors when shouldRetry filters them out", async () => {
    let count = 0;
    await expect(withRetry(async () => {
      count++;
      const err = new Error("Client error");
      // @ts-expect-error attach code for predicate
      err.code = 400;
      throw err;
    }, {
      attempts: 5,
      shouldRetry: (e) => (e as any)?.code >= 500,
    })).rejects.toThrow("Client error");
    expect(count).toBe(1);
  });

  it("throws TimeoutError if single attempt exceeds timeout", async () => {
    await expect(withRetry(async () => {
      await new Promise(res => setTimeout(res, 50));
      return "done";
    }, { attempts: 1, timeoutMs: 10 })).rejects.toBeInstanceOf(TimeoutError);
  });
});
