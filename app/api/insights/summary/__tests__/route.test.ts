import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/insights/summary/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const testState = vi.hoisted(() => ({
  uid: "teacher-1",
  lastRequestedUid: null as string | null,
  users: {} as Record<
    string,
    {
      monthlyUsage?: { generationCount?: number }
      updatedAt?: string | null
      snippets?: Array<{ createdAt: string }>
    }
  >,
}))

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

function buildQuery(records: Array<{ createdAt: string }>, filters: Array<{ field: string; op: string; value: string }> = [], take = 500) {
  return {
    where(field: string, op: string, value: string) {
      return buildQuery(records, [...filters, { field, op, value }], take)
    },
    orderBy() {
      return this
    },
    limit(nextTake: number) {
      return buildQuery(records, filters, nextTake)
    },
    async get() {
      let filtered = [...records]
      for (const filter of filters) {
        if (filter.field !== "createdAt") {
          continue
        }
        filtered = filtered.filter((record) => {
          if (filter.op === ">=") {
            return record.createdAt >= filter.value
          }
          if (filter.op === "<") {
            return record.createdAt < filter.value
          }
          return true
        })
      }
      filtered.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      const docs = filtered.slice(0, take).map((record) => ({
        data: () => record,
      }))
      return {
        size: docs.length,
        docs,
      }
    },
  }
}

function createFirestoreStub() {
  return {
    collection(name: string) {
      expect(name).toBe("users")
      return {
        doc(uid: string) {
          testState.lastRequestedUid = uid
          const userRecord = testState.users[uid] ?? {}
          return {
            async get() {
              return {
                exists: uid in testState.users,
                data: () => userRecord,
              }
            },
            collection(childName: string) {
              expect(childName).toBe("snippets")
              return buildQuery(userRecord.snippets ?? [])
            },
          }
        },
      }
    },
  }
}

describe("GET /api/insights/summary", () => {
  beforeEach(() => {
    testState.uid = "teacher-1"
    testState.lastRequestedUid = null
    testState.users = {}
    vi.clearAllMocks()
    vi.mocked(authorizeFirebaseRequest).mockImplementation(
      async () =>
        ({
          uid: testState.uid,
          firestore: createFirestoreStub(),
        }) as never,
    )
  })

  it("builds insights from real snippet activity even when monthly usage stays at zero", async () => {
    testState.uid = "qa-teacher"
    testState.users = {
      "qa-teacher": {
        monthlyUsage: { generationCount: 0 },
        snippets: [
          { createdAt: "2026-03-16T09:00:00.000Z" },
          { createdAt: "2026-03-15T09:00:00.000Z" },
        ],
      },
    }

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.summary.draftsCreated.total).toBe(2)
    expect(json.summary.timeSaved.minutes).toBe(6)
    expect(json.summary.currentStreak.days).toBe(2)
  })

  it("respects the authenticated user when selecting insight data", async () => {
    testState.uid = "teacher-b"
    testState.users = {
      "teacher-a": {
        snippets: [{ createdAt: "2026-03-16T09:00:00.000Z" }],
      },
      "teacher-b": {
        monthlyUsage: { generationCount: 0 },
        snippets: [],
      },
    }

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(testState.lastRequestedUid).toBe("teacher-b")
    expect(json.summary.draftsCreated.total).toBe(0)
  })

  it("filters snippet activity to the requested date range", async () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString()
    const older = new Date(Date.now() - 40 * 86_400_000).toISOString()
    testState.users = {
      "teacher-1": {
        snippets: [{ createdAt: recent }, { createdAt: older }],
      },
    }

    const shortRangeResponse = await GET(new Request("http://localhost/api/insights/summary?rangeDays=7"))
    const shortRangeJson = await shortRangeResponse.json()
    expect(shortRangeJson.summary.draftsCreated.total).toBe(1)

    const longRangeResponse = await GET(new Request("http://localhost/api/insights/summary?rangeDays=90"))
    const longRangeJson = await longRangeResponse.json()
    expect(longRangeJson.summary.draftsCreated.total).toBe(2)
  })

  it("falls back to the monthly usage counter when snippet history is absent", async () => {
    testState.users = {
      "teacher-1": {
        monthlyUsage: { generationCount: 4 },
        updatedAt: "2026-03-16T09:00:00.000Z",
      },
    }

    const response = await GET(new Request("http://localhost/api/insights/summary"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.draftsCreated.total).toBe(4)
    expect(json.summary.timeSaved.minutes).toBe(12)
  })

  it("does not let the monthly counter override an explicit empty date range", async () => {
    testState.users = {
      "teacher-1": {
        monthlyUsage: { generationCount: 4 },
        updatedAt: "2026-03-16T09:00:00.000Z",
        snippets: [],
      },
    }

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=7"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.draftsCreated.total).toBe(0)
  })
})
