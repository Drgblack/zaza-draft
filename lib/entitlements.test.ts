import type { Firestore } from "firebase-admin/firestore"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getUserEntitlements } from "./entitlements"
import * as zidClient from "@/lib/zid/client"
import * as usageModule from "./usage"
import * as qaModule from "@/lib/auth/internal-qa"

const usageRecord = {
  month: "2026-02",
  generationCount: 1,
  lastReset: "now",
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getUserEntitlements (ZID-backed)", () => {
  it("treats ZID access as pro and builds unlimited usage", async () => {
    const entitlement = {
      hasAccess: true,
      accessType: "paid",
      source: "zid",
      expiresAt: null,
      checkedAt: new Date().toISOString(),
    }
    const mockedEntitlement = vi.spyOn(zidClient, "getDraftEntitlement").mockResolvedValue(entitlement)
    const mockedFetchUsage = vi
      .spyOn(usageModule, "fetchUsageRecord")
      .mockResolvedValue(usageRecord as usageModule.MonthlyUsageRecord)
    const mockedBuildUsage = vi.spyOn(usageModule, "buildUsageResponse").mockReturnValue({
      plan: "pro",
      currentMonthUsage: 1,
      limit: null,
      remaining: null,
      unlimited: true,
    })
    vi.spyOn(qaModule, "isInternalQaUid").mockReturnValue(false)

    const result = await getUserEntitlements("user-1", {} as Firestore, {
      authHeader: "Bearer token",
      requestId: "req-123",
    })

    expect(result.plan).toBe("pro")
    expect(result.isProSubscriber).toBe(true)
    expect(result.entitlement).toEqual(entitlement)
    expect(mockedEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", authHeader: "Bearer token", requestId: "req-123" }),
    )
    expect(mockedFetchUsage).toHaveBeenCalledTimes(1)
    expect(mockedBuildUsage).toHaveBeenCalledWith(usageRecord, "pro", { unlimited: true })
  })

  it("fails closed when ZID denies and still marks QA usage as unlimited", async () => {
    const entitlement = {
      hasAccess: false,
      accessType: undefined,
      source: undefined,
      expiresAt: null,
      reason: "denied",
      checkedAt: new Date().toISOString(),
    }
    vi.spyOn(zidClient, "getDraftEntitlement").mockResolvedValue(entitlement)
    const mockedFetchUsage = vi
      .spyOn(usageModule, "fetchUsageRecord")
      .mockResolvedValue(usageRecord as usageModule.MonthlyUsageRecord)
    const mockedBuildUsage = vi.spyOn(usageModule, "buildUsageResponse").mockReturnValue({
      plan: "free",
      currentMonthUsage: 1,
      limit: 10,
      remaining: 9,
      unlimited: true,
    })
    vi.spyOn(qaModule, "isInternalQaUid").mockReturnValue(true)

    const result = await getUserEntitlements("qa-user", {} as Firestore)

    expect(result.plan).toBe("free")
    expect(result.isProSubscriber).toBe(false)
    expect(result.entitlement.hasAccess).toBe(false)
    expect(result.entitlement.reason).toBe("denied")
    expect(mockedFetchUsage).toHaveBeenCalledTimes(1)
    expect(mockedBuildUsage).toHaveBeenCalledWith(usageRecord, "free", { unlimited: true })
  })
})
