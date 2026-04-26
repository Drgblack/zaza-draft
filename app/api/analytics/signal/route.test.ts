import { beforeEach, describe, expect, it, vi } from "vitest"

const testState = vi.hoisted(() => ({
  writes: [] as Array<Record<string, unknown>>,
}))

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdmin: vi.fn(() => ({
    auth: null,
    firestore: {
      collection: () => ({
        doc: () => ({
          set: async (payload: Record<string, unknown>) => {
            testState.writes.push(payload)
          },
        }),
      }),
    },
    storage: null,
  })),
}))

describe("POST /api/analytics/signal", () => {
  beforeEach(() => {
    vi.resetModules()
    testState.writes = []
  })

  it("rejects payloads with overlong text fields", async () => {
    const { POST } = await import("@/app/api/analytics/signal/route")
    const response = await POST(
      new Request("http://localhost/api/analytics/signal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "req-1",
          uidHash: "hash-1",
          signalType: "teacher_draft_mode_used",
          payload: {
            feature: "teacher_draft_mode",
            context: "x".repeat(300),
          },
          appVersion: "0.1.0",
          locale: "en",
        }),
      }),
    )

    expect(response.status).toBe(400)
    expect(testState.writes).toHaveLength(0)
  })

  it("stores a valid signal", async () => {
    const { POST } = await import("@/app/api/analytics/signal/route")
    const response = await POST(
      new Request("http://localhost/api/analytics/signal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "req-2",
          uidHash: "hash-2",
          signalType: "draft_accepted",
          payload: {
            interactionType: "accepted",
            timeToActionMs: 950,
            editDistanceCategory: "none",
          },
          appVersion: "0.1.0",
          locale: "en",
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(testState.writes).toHaveLength(1)
    expect(testState.writes[0].signalType).toBe("draft_accepted")
  })

  it("enforces the per-uidHash rate limit", async () => {
    const { POST } = await import("@/app/api/analytics/signal/route")
    const makeRequest = () =>
      POST(
        new Request("http://localhost/api/analytics/signal", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sessionId: "req-rate",
            uidHash: "hash-rate",
            signalType: "draft_regenerated",
            payload: {
              interactionType: "regenerated",
              timeToActionMs: 220,
            },
            appVersion: "0.1.0",
            locale: "en",
          }),
        }),
      )

    const responses = await Promise.all(
      Array.from({ length: 25 }, () => makeRequest()),
    )

    const statuses = responses.map((response) => response.status)
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true)
    expect(statuses.slice(20).every((status) => status === 429)).toBe(true)
  })
})
