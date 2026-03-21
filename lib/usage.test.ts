import { describe, expect, it, vi } from "vitest"

import {
  buildUsageResponse,
  FREE_TIER_LIMIT,
  getCurrentMonthKey,
  incrementUsage,
  type MonthlyUsageRecord,
} from "./usage"

class MockDocRef {
  constructor(private store: Record<string, Record<string, unknown>>, private key: string) {}

  get() {
    const data = this.store[this.key]
    return Promise.resolve({
      exists: Boolean(data),
      data: () => data,
    })
  }

  set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    if (options?.merge && this.store[this.key]) {
      this.store[this.key] = { ...(this.store[this.key] ?? {}), ...data }
    } else {
      this.store[this.key] = data
    }
    return Promise.resolve()
  }
}

class MockCollection {
  constructor(private store: Record<string, Record<string, unknown>>) {}

  doc(key: string) {
    return new MockDocRef(this.store, key)
  }
}

class MockTransaction {
  async get(ref: MockDocRef) {
    return ref.get()
  }

  async set(ref: MockDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
    return ref.set(data, options)
  }
}

class MockFirestore {
  constructor(private store: Record<string, Record<string, unknown>>) {}

  collection(_path: string) {
    return new MockCollection(this.store)
  }

  async runTransaction<T>(callback: (tx: MockTransaction) => Promise<T>) {
    const tx = new MockTransaction()
    return callback(tx)
  }
}

function createUsageRecord(count: number): MonthlyUsageRecord {
  return {
    month: getCurrentMonthKey(),
    generationCount: count,
    lastReset: new Date().toISOString(),
  }
}

describe("buildUsageResponse", () => {
  const baseRecord = createUsageRecord(5)

  it("marks unlimited when override is true", () => {
    const usage = buildUsageResponse(baseRecord, "free", { unlimited: true })
    expect(usage.unlimited).toBe(true)
    expect(usage.limit).toBeNull()
    expect(usage.remaining).toBeNull()
  })

  it("respects limits for free plans when override is absent", () => {
    const usage = buildUsageResponse(baseRecord, "free")
    expect(usage.unlimited).toBe(false)
    expect(usage.limit).toBe(FREE_TIER_LIMIT)
    expect(usage.remaining).toBe(0)
  })
})

describe("incrementUsage", () => {
  const uid = "test-uid"

  it("throws when the free limit is reached and unlimited flag is false", async () => {
    const firestore = new MockFirestore({
      [uid]: { monthlyUsage: createUsageRecord(FREE_TIER_LIMIT) },
    })

    await expect(incrementUsage(uid, firestore, false)).rejects.toThrow("USAGE_LIMIT_EXCEEDED")
  })

  it("allows additional drafts when unlimited flag is true", async () => {
    const store: Record<string, Record<string, unknown>> = {
      [uid]: { monthlyUsage: createUsageRecord(FREE_TIER_LIMIT) },
    }
    const firestore = new MockFirestore(store)

    const updated = await incrementUsage(uid, firestore, true)
    expect(updated.generationCount).toBe(FREE_TIER_LIMIT + 1)
    expect(store[uid].monthlyUsage).toEqual(updated)
  })
})

describe("getCurrentMonthKey", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the current year-month in UTC", () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2025, 0, 2, 12, 0, 0))
    expect(getCurrentMonthKey()).toBe("2025-01")
  })

  it("pads single-digit months", () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2025, 9, 15, 8, 0, 0))
    expect(getCurrentMonthKey()).toBe("2025-10")
  })
})
