import { describe, expect, it, beforeEach, vi } from "vitest"

import {
  getDraftEntitlement,
  __resetDraftEntitlementCache,
  DRAFT_PRODUCT_KEY,
} from "@/lib/zid/client"

const BASE_URL = "https://zid.example.com"

describe("zid entitlement client", () => {
  beforeEach(() => {
    __resetDraftEntitlementCache()
    vi.restoreAllMocks()
    process.env.ZID_BASE_URL = BASE_URL
    vi.useRealTimers()
  })

  it("returns allow when resolve-self responds with access", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        hasAccess: true,
        accessType: "paid",
        source: "org",
        expiresAt: null,
      }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await getDraftEntitlement({
      userId: "u1",
      productKey: DRAFT_PRODUCT_KEY,
      authHeader: "Bearer token",
    })

    expect(result.hasAccess).toBe(true)
    expect(result.accessType).toBe("paid")
    expect(result.source).toBe("org")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("fails closed when fetch rejects", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down")
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await getDraftEntitlement({
      userId: "u1",
      productKey: DRAFT_PRODUCT_KEY,
      authHeader: "Bearer token",
    })

    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe("fetch_error")
  })

  it("uses session cache within TTL", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ hasAccess: true }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    const first = await getDraftEntitlement({
      userId: "u1",
      productKey: DRAFT_PRODUCT_KEY,
      authHeader: "Bearer token",
    })
    const second = await getDraftEntitlement({
      userId: "u1",
      productKey: DRAFT_PRODUCT_KEY,
      authHeader: "Bearer token",
    })

    expect(first.hasAccess).toBe(true)
    expect(second.hasAccess).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("shortens TTL when expiry is near", async () => {
    vi.useFakeTimers()
    const expiresSoon = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasAccess: true, expiresAt: expiresSoon }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasAccess: false }),
      })
    vi.stubGlobal("fetch", fetchMock)

    const first = await getDraftEntitlement({
      userId: "u1",
      productKey: DRAFT_PRODUCT_KEY,
      authHeader: "Bearer token",
    })
    expect(first.hasAccess).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // advance beyond short TTL (15s) to force refetch
    vi.advanceTimersByTime(16_000)

    const second = await getDraftEntitlement({
      userId: "u1",
      productKey: DRAFT_PRODUCT_KEY,
      authHeader: "Bearer token",
    })
    expect(second.hasAccess).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
