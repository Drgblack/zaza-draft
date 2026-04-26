import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/admin/analytics/summary/route"
import {
  buildProductDevelopmentFeed,
  summarizeUsageSignals,
  type UsageSignalRecord,
} from "@/lib/admin/analytics-dashboard"

const mockRequireAdminRole = vi.fn()
const mockGetFirebaseAdmin = vi.fn()
const mockGetUserProfile = vi.fn()

vi.mock("@/lib/auth/get-user-role", () => ({
  requireAdminRole: (...args: unknown[]) => mockRequireAdminRole(...args),
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdmin: () => mockGetFirebaseAdmin(),
}))

function createUsageSignalsSnapshot(signals: UsageSignalRecord[]) {
  return {
    docs: signals.map((signal) => ({
      data: () => signal,
    })),
  }
}

function createFirestore(signals: UsageSignalRecord[]) {
  return {
    collection: (name: string) => {
      if (name !== "usage_signals") {
        throw new Error(`Unexpected collection ${name}`)
      }

      return {
        where: vi.fn(() => ({
          get: vi.fn(async () => createUsageSignalsSnapshot(signals)),
        })),
        get: vi.fn(async () => createUsageSignalsSnapshot(signals)),
      }
    },
  }
}

describe("GET /api/admin/analytics/summary", () => {
  beforeEach(() => {
    mockRequireAdminRole.mockReset()
    mockGetFirebaseAdmin.mockReset()
    mockGetUserProfile.mockReset()
  })

  it("aggregates generation rates correctly", async () => {
    const signals: UsageSignalRecord[] = [
      ...Array.from({ length: 10 }, (_, index) => ({
        signalId: `generated-${index}`,
        signalType: "draft_generated",
        timestamp: Date.now(),
      })),
      ...Array.from({ length: 2 }, (_, index) => ({
        signalId: `fallback-${index}`,
        signalType: "draft_fallback_used",
        timestamp: Date.now(),
      })),
    ]

    mockRequireAdminRole.mockResolvedValue({ uid: "admin", role: "admin" })
    mockGetFirebaseAdmin.mockReturnValue({ firestore: createFirestore(signals) })
    mockGetUserProfile.mockResolvedValue({ schoolId: null })

    const response = await GET(
      new Request("https://app.zazadraft.com/api/admin/analytics/summary?days=7") as never,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.summary.fallbackRate).toBeCloseTo(0.167, 3)
    expect(payload.summary.generationSuccessRate).toBeCloseTo(0.833, 3)
  })

  it("uses the shared admin auth gate and redirects non-admins to login", async () => {
    mockRequireAdminRole.mockResolvedValue(
      NextResponse.redirect("https://app.zazadraft.com/admin/login"),
    )

    const response = await GET(
      new Request("https://app.zazadraft.com/api/admin/analytics/summary?days=7") as never,
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/admin/login")
  })

  it("applies product feed thresholds for fallback rate", () => {
    const belowThresholdFeed = buildProductDevelopmentFeed(
      summarizeUsageSignals(
        [
          ...Array.from({ length: 19 }, (_, index) => ({
            signalId: `generated-${index}`,
            signalType: "draft_generated",
            timestamp: Date.now(),
          })),
          {
            signalId: "fallback-1",
            signalType: "draft_fallback_used",
            timestamp: Date.now(),
          },
        ],
        "7",
      ),
    )

    expect(belowThresholdFeed.some((item) => item.signalType === "draft_fallback_used")).toBe(false)

    const aboveThresholdFeed = buildProductDevelopmentFeed(
      summarizeUsageSignals(
        [
          ...Array.from({ length: 17 }, (_, index) => ({
            signalId: `generated-2-${index}`,
            signalType: "draft_generated",
            timestamp: Date.now(),
          })),
          ...Array.from({ length: 3 }, (_, index) => ({
            signalId: `fallback-2-${index}`,
            signalType: "draft_fallback_used",
            timestamp: Date.now(),
          })),
        ],
        "7",
      ),
    )

    expect(aboveThresholdFeed.some((item) => item.signalType === "draft_fallback_used")).toBe(true)
  })
})
