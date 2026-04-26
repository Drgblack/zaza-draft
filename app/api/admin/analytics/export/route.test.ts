import { NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/admin/analytics/export/route"
import type { UsageSignalRecord } from "@/lib/admin/analytics-dashboard"

const mockRequireAdminRole = vi.fn()
const mockGetFirebaseAdmin = vi.fn()

vi.mock("@/lib/auth/get-user-role", () => ({
  requireAdminRole: (...args: unknown[]) => mockRequireAdminRole(...args),
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

describe("GET /api/admin/analytics/export", () => {
  beforeEach(() => {
    mockRequireAdminRole.mockReset()
    mockGetFirebaseAdmin.mockReset()
  })

  it("exports flattened CSV rows with safe headers", async () => {
    const signals: UsageSignalRecord[] = [
      {
        signalId: "signal-1",
        signalType: "draft_generated",
        timestamp: 1710000000000,
        locale: "en",
        appVersion: "0.1.0",
        sessionId: "session-1",
        uidHash: "hash-1",
        payload: {
          modelUsed: "test-model",
          generationAttempts: 1,
          sourceWordCount: 20,
          outputWordCount: 25,
          inputIntent: "teacher_to_parent",
          languagePair: "en-en",
          latencyMs: 450,
        },
      },
    ]

    mockRequireAdminRole.mockResolvedValue({ uid: "admin", role: "admin" })
    mockGetFirebaseAdmin.mockReturnValue({ firestore: createFirestore(signals) })

    const response = await GET(
      new Request("https://app.zazadraft.com/api/admin/analytics/export?days=30") as never,
    )
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-disposition")).toContain("zaza-signals-")
    expect(csv.split("\n")[0]).toContain("signalId,signalType,timestamp,locale,appVersion")
    expect(csv).not.toContain("Dear Parent")
  })

  it("redirects unauthorised export requests to admin login", async () => {
    mockRequireAdminRole.mockResolvedValue(
      NextResponse.redirect("https://app.zazadraft.com/admin/login"),
    )

    const response = await GET(
      new Request("https://app.zazadraft.com/api/admin/analytics/export?days=30") as never,
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/admin/login")
  })
})
