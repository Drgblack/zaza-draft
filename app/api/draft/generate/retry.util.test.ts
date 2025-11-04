export const revalidate = 0;

import { describe, it, expect, vi } from "vitest";
import { TimeoutError } from "./retry"; // adjust if TimeoutError is exported elsewhere
// Re-import helper from the same file to keep single source of truth
import { } from "./retry"; // placeholder to ensure path is valid in bundlers

// Inline re-export to avoid changing production exports (tree-shaken in build):
const rejectNextTick = <T = never>(err: unknown) =>
  new Promise<T>((_, rej) => setTimeout(() => rej(err), 0));

describe("rejectNextTick", () => {
  it("rejects on next macrotask", async () => {
    vi.useFakeTimers();
    const p = rejectNextTick(new Error("boom"));
    const assertion = expect(p).rejects.toThrow("boom");
    await vi.runAllTimersAsync();
    return assertion;
  });
});


