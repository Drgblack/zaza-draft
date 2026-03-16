import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/insights/summary/route"
import { buildTeacherHash } from "@/lib/analytics-identifiers"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

type AnalyticsEventRecord = {
  teacher_hash: string
  event_name: string
  timestamp: string
  message_context: string
  workflow_type: string
  time_context: string
  edit_depth: number
  risk_flag?: string | null
  teacher_intent?: string | null
}

type SnippetRecord = {
  createdAt: unknown
}

const testState = vi.hoisted(() => ({
  uid: "teacher-1",
  lastTeacherHash: null as string | null,
  analyticsEvents: [] as AnalyticsEventRecord[],
  snippets: [] as SnippetRecord[],
  userUpdatedAt: null as string | null,
  generationCount: 0,
  queryError: null as Error | null,
}))

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

function buildQuery(
  records: Array<Record<string, unknown>>,
  source: "events" | "snippets",
  filters: Array<{ field: string; op: string; value: string }> = [],
  take = 2000,
  orderField: string | null = null,
) {
  return {
    where(field: string, op: string, value: string) {
      if (field === "teacher_hash" && op === "==") {
        testState.lastTeacherHash = value
      }
      return buildQuery(records, source, [...filters, { field, op, value }], take, orderField)
    },
    orderBy(field: string) {
      return buildQuery(records, source, filters, take, field)
    },
    limit(nextTake: number) {
      return buildQuery(records, source, filters, nextTake, orderField)
    },
    async get() {
      if (source === "events" && testState.queryError) {
        throw testState.queryError
      }

      let filtered = [...records]

      for (const filter of filters) {
        filtered = filtered.filter((record) => {
          const value = String((record as Record<string, unknown>)[filter.field] ?? "")
          if (filter.op === "==") {
            return value === filter.value
          }
          if (filter.op === ">=") {
            return value >= filter.value
          }
          if (filter.op === "<") {
            return value < filter.value
          }
          return true
        })
      }

      const sortField = orderField ?? (source === "events" ? "timestamp" : "createdAt")
      filtered.sort((left, right) =>
        String(right[sortField] ?? "").localeCompare(String(left[sortField] ?? "")),
      )
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
      if (name === "analyticsEvents") {
        return buildQuery(testState.analyticsEvents as Array<Record<string, unknown>>, "events")
      }

      if (name === "users") {
        return {
          doc(id: string) {
            expect(id).toBe(testState.uid)
            return {
              async get() {
                return {
                  exists: Boolean(testState.userUpdatedAt || testState.generationCount),
                  data: () => ({
                    updatedAt: testState.userUpdatedAt,
                    monthlyUsage: { generationCount: testState.generationCount },
                  }),
                }
              },
              collection(childName: string) {
                expect(childName).toBe("snippets")
                return buildQuery(testState.snippets as Array<Record<string, unknown>>, "snippets")
              },
            }
          },
        }
      }

      throw new Error(`Unexpected collection ${name}`)
    },
  }
}

function createDraftEvent(
  uid: string,
  overrides: Partial<AnalyticsEventRecord>,
): AnalyticsEventRecord {
  return {
    teacher_hash: buildTeacherHash(uid),
    event_name: "draft_created",
    timestamp: "2026-03-16T09:00:00.000Z",
    message_context: "parent_email",
    workflow_type: "new_message",
    time_context: "school_hours",
    edit_depth: 0,
    ...overrides,
  }
}

function createSnippet(createdAt: unknown): SnippetRecord {
  return { createdAt }
}

describe("GET /api/insights/summary", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-21T12:00:00.000Z"))
    vi.stubEnv("ANALYTICS_HASH_SALT", "unit-test-salt")
    testState.uid = "teacher-1"
    testState.lastTeacherHash = null
    testState.analyticsEvents = []
    testState.snippets = []
    testState.userUpdatedAt = null
    testState.generationCount = 0
    testState.queryError = null
    vi.clearAllMocks()
    vi.mocked(authorizeFirebaseRequest).mockImplementation(
      async () =>
        ({
          uid: testState.uid,
          firestore: createFirestoreStub(),
        }) as never,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("builds insights from append-only draft events", async () => {
    testState.uid = "qa-teacher"
    testState.analyticsEvents = [
      createDraftEvent("qa-teacher", {
        timestamp: "2026-03-16T09:00:00.000Z",
      }),
      createDraftEvent("qa-teacher", {
        timestamp: "2026-03-15T09:00:00.000Z",
      }),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.summary.draftsCreated.total).toBe(2)
    expect(json.summary.timeSaved.minutes).toBe(6)
    expect(json.summary.currentStreak.days).toBe(2)
  })

  it("respects the authenticated user when selecting event data", async () => {
    testState.uid = "teacher-b"
    testState.analyticsEvents = [
      createDraftEvent("teacher-a", {
        timestamp: "2026-03-16T09:00:00.000Z",
      }),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(testState.lastTeacherHash).toBe(buildTeacherHash("teacher-b"))
    expect(json.summary.draftsCreated.total).toBe(0)
  })

  it("filters event activity to the requested date range", async () => {
    testState.analyticsEvents = [
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-14T13:00:00.000Z",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-02-01T09:00:00.000Z",
      }),
    ]

    const shortRangeResponse = await GET(new Request("http://localhost/api/insights/summary?rangeDays=7"))
    const shortRangeJson = await shortRangeResponse.json()
    expect(shortRangeJson.summary.draftsCreated.total).toBe(1)

    const longRangeResponse = await GET(new Request("http://localhost/api/insights/summary?rangeDays=90"))
    const longRangeJson = await longRangeResponse.json()
    expect(longRangeJson.summary.draftsCreated.total).toBe(2)
  })

  it("returns zeroed insights when no consented analytics events exist", async () => {
    const response = await GET(new Request("http://localhost/api/insights/summary"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.draftsCreated.total).toBe(0)
    expect(json.summary.timeSaved.minutes).toBe(0)
  })

  it("falls back to snippet history when analytics events are sparse", async () => {
    testState.analyticsEvents = [
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-20T10:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
    ]
    testState.snippets = [
      createSnippet("2026-03-20T10:00:00.000Z"),
      createSnippet("2026-03-19T10:00:00.000Z"),
      createSnippet("2026-03-18T10:00:00.000Z"),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.summary.draftsCreated.total).toBe(3)
    expect(json.summary.communicationLoad.score).toBeGreaterThan(0)
  })

  it("falls back to snippet history while Firestore indexes are building", async () => {
    testState.queryError = Object.assign(new Error("FAILED_PRECONDITION: The query requires an index."), {
      code: "failed-precondition",
    })
    testState.snippets = [createSnippet("2026-03-20T10:00:00.000Z")]

    const response = await GET(new Request("http://localhost/api/insights/summary"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.degraded).toBe(true)
    expect(json.summary.draftsCreated.total).toBe(1)
  })

  it("returns teacher communication load trends from weekly event data", async () => {
    testState.analyticsEvents = [
      createDraftEvent("teacher-1", {
        timestamp: "2026-02-26T09:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-02-27T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-02-28T09:00:00.000Z",
        time_context: "weekend",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-01T09:00:00.000Z",
        time_context: "weekend",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-03T09:00:00.000Z",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-04T19:00:00.000Z",
        time_context: "after_hours",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-05T09:00:00.000Z",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-06T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-07T09:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-10T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-11T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-12T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-14T09:00:00.000Z",
        time_context: "weekend",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-13T09:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-15T09:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-16T19:00:00.000Z",
        time_context: "after_hours",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-17T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-18T09:00:00.000Z",
        event_name: "rewrite_accepted",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-19T09:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-20T09:00:00.000Z",
        event_name: "risk_flag_triggered",
      }),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.communicationLoad.score).toBe(22)
    expect(json.summary.communicationLoad.trend).toBe(-19)
    expect(json.summary.communicationLoad.fourWeekTrend).toEqual([24, 18, 27, 22])
    expect(json.summary.communicationLoad.improvementIndicator).toBe("improving")
  })

  it("does not let older event data override an explicitly empty current range", async () => {
    testState.analyticsEvents = [
      createDraftEvent("teacher-1", {
        timestamp: "2026-02-01T09:00:00.000Z",
      }),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=7"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.draftsCreated.total).toBe(0)
  })

  it("uses generation count as the last historical fallback when analytics and snippets are unavailable", async () => {
    testState.generationCount = 12
    testState.userUpdatedAt = "2026-03-20T10:00:00.000Z"

    const response = await GET(new Request("http://localhost/api/insights/summary"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.draftsCreated.total).toBe(12)
  })

  it("builds the weekly reflection from the last 7 days only", async () => {
    testState.analyticsEvents = [
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-19T10:00:00.000Z",
        teacher_intent: "respond_to_complaint",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-18T10:00:00.000Z",
        teacher_intent: "respond_to_complaint",
      }),
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-02T10:00:00.000Z",
        event_name: "documentation_mode_enabled",
        message_context: "incident_record",
        workflow_type: "documentation_mode",
      }),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.weeklyReflection.key).toBe("insights.weeklyReflection.complaints")
  })

  it("generates a weekly reflection from minimal documentation-only activity", async () => {
    testState.analyticsEvents = [
      createDraftEvent("teacher-1", {
        timestamp: "2026-03-20T10:00:00.000Z",
        event_name: "documentation_mode_enabled",
        message_context: "incident_record",
        workflow_type: "documentation_mode",
      }),
    ]

    const response = await GET(new Request("http://localhost/api/insights/summary?rangeDays=30"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.summary.weeklyReflection.key).toBe("insights.weeklyReflection.documentation")
  })
})
