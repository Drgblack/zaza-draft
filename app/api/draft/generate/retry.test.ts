import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, TimeoutError } from "./retry";

// Keep the env stable per test to avoid cross-talk with test:debug
const saveEnv = () => ({ DEBUG_RETRY: process.env.DEBUG_RETRY });
const restoreEnv = (env: Record<string, string | undefined>) => {
  if (env.DEBUG_RETRY === undefined) delete process.env.DEBUG_RETRY;
  else process.env.DEBUG_RETRY = env.DEBUG_RETRY;
};

describe("withRetry", () => {
  let envBackup: Record<string, string | undefined>;

  beforeEach(() => {
    envBackup = saveEnv();
  });

  afterEach(() => {
    restoreEnv(envBackup);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries and eventually succeeds (fast, no real waits, no logs by default)", async () => {
    // Force silent mode regardless of the environment
    delete process.env.DEBUG_RETRY;

    vi.useFakeTimers();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    let count = 0;

    const p = withRetry(async () => {
      count++;
      if (count < 3) throw new Error("Persistent error");
      return "ok";
    }, {
      attempts: 3,
      base: 1000,
      factor: 1.5,
      jitter: false, // deterministic: 1000ms then 1500ms
      // no logger => silent
    });

    // Advance the two backoffs deterministically: 1000 + 1500
    await vi.advanceTimersByTimeAsync(1000 + 1500);
    await expect(p).resolves.toBe("ok");
    expect(count).toBe(3);

    // No logs because DEBUG_RETRY is cleared and no logger provided
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("does not retry on 4xx-like errors when shouldRetry filters them out", async () => {
    delete process.env.DEBUG_RETRY;

    let count = 0;
    await expect(withRetry(async () => {
      count++;
      const err = new Error("Client error") as any;
      err.code = 400;
      throw err;
    }, {
      attempts: 5,
      shouldRetry: (e) => (e as any)?.code >= 500,
    })).rejects.toThrow("Client error");

    expect(count).toBe(1);
  });

  it("throws TimeoutError if single attempt exceeds timeout (fast via fake timers)", async () => {
    delete process.env.DEBUG_RETRY;
    vi.useFakeTimers();

    const p = withRetry(async () => {
      // Simulate 50ms work
      await new Promise(res => setTimeout(res, 50));
      return "done";
    }, { attempts: 1, timeoutMs: 10 });

    // Advance just beyond the attempt timeout
    await vi.advanceTimersByTimeAsync(11);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });
});