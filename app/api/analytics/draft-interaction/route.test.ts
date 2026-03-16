import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/analytics/draft-interaction/route"
import { buildSchoolHash, buildTeacherHash } from "@/lib/analytics-identifiers"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const testState = vi.hoisted(() => ({
  uid: "teacher-1",
  email: "teacher@school.example.org",
  userData: {} as Record<string, unknown>,
  analyticsEvents: [] as Array<Record<string, unknown>>,
  teacherWeeklyWrites: [] as Array<{ id: string; payload: Record<string, unknown> }>,
  schoolWeeklyWrites: [] as Array<{ id: string; payload: Record<string, unknown> }>,
}))

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "server-timestamp",
    increment: (amount: number) => ({ __increment__: amount }),
  },
}))

function createFirestoreStub() {
  return {
    collection(name: string) {
      if (name === "analyticsEvents") {
        return {
          async add(payload: Record<string, unknown>) {
            testState.analyticsEvents.push(payload)
          },
        }
      }

      if (name === "analyticsTeacherWeeklyMetrics") {
        return {
          doc(id: string) {
            return {
              async set(payload: Record<string, unknown>) {
                testState.teacherWeeklyWrites.push({ id, payload })
              },
            }
          },
        }
      }

      if (name === "schoolAnalyticsWeeklyMetrics") {
        return {
          doc(id: string) {
            return {
              async set(payload: Record<string, unknown>) {
                testState.schoolWeeklyWrites.push({ id, payload })
              },
            }
          },
        }
      }

      if (name === "users") {
        return {
          doc(uid: string) {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => testState.userData,
                }
              },
            }
          },
        }
      }

      throw new Error(`Unexpected collection ${name}`)
    },
  }
}

describe("POST /api/analytics/draft-interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ANALYTICS_HASH_SALT", "unit-test-salt")
    testState.uid = "teacher-1"
    testState.email = "teacher@school.example.org"
    testState.userData = {}
    testState.analyticsEvents = []
    testState.teacherWeeklyWrites = []
    testState.schoolWeeklyWrites = []

    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: testState.uid,
      decodedToken: {
        uid: testState.uid,
        email: testState.email,
      },
      firestore: createFirestoreStub(),
    } as never)
  })

  it("stores hashed teacher and school identifiers and writes school-safe aggregates", async () => {
    testState.userData = {
      entitlements: {
        schoolDomainOverride: "district.example.schule",
      },
    }

    const response = await POST(
      new Request("http://localhost/api/analytics/draft-interaction", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer token",
        },
        body: JSON.stringify({
          consent: true,
          event: {
            event_name: "draft_created",
            message_context: "incident_record",
            edit_depth: 2,
            time_context: "after_hours",
            workflow_type: "documentation_mode",
            reaction_prediction: "calm",
            teacher_intent: "document_incident",
            timestamp: "2026-03-16T18:30:00.000Z",
            message_text: "should never be stored",
            school_name: "Example School",
          },
        }),
      }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, stored: true })
    expect(testState.analyticsEvents).toHaveLength(1)
    expect(testState.teacherWeeklyWrites).toHaveLength(1)
    expect(testState.schoolWeeklyWrites).toHaveLength(1)

    const storedEvent = testState.analyticsEvents[0]
    expect(storedEvent.schema_name).toBe("draft_interaction_event")
    expect(storedEvent.event_name).toBe("draft_created")
    expect(storedEvent.schema_version).toBe(3)
    expect(storedEvent.teacher_intent).toBe("document_incident")
    expect(storedEvent.teacher_hash).toBe(buildTeacherHash(testState.uid))
    expect(storedEvent.school_hash).toBe(buildSchoolHash("district.example.schule"))
    expect(storedEvent).not.toHaveProperty("message_text")
    expect(storedEvent).not.toHaveProperty("school_name")
    expect(JSON.stringify(storedEvent)).not.toContain(testState.email)
    expect(JSON.stringify(storedEvent)).not.toContain("district.example.schule")

    const teacherWeekly = testState.teacherWeeklyWrites[0]
    expect(teacherWeekly.id).toBe(`${buildTeacherHash(testState.uid)}_2026-03-16`)
    expect(teacherWeekly.payload.teacher_hash).toBe(buildTeacherHash(testState.uid))
    expect(teacherWeekly.payload.school_hash).toBe(buildSchoolHash("district.example.schule"))
    expect(teacherWeekly.payload.documentation_mode_usage).toEqual({ __increment__: 1 })

    const schoolWeekly = testState.schoolWeeklyWrites[0]
    expect(schoolWeekly.id).toBe(`${buildSchoolHash("district.example.schule")}_2026-03-16`)
    expect(schoolWeekly.payload.school_hash).toBe(buildSchoolHash("district.example.schule"))
    expect(schoolWeekly.payload.draft_count).toEqual({ __increment__: 1 })
    expect(schoolWeekly.payload.after_hours_messages).toEqual({ __increment__: 1 })
    expect(schoolWeekly.payload.documentation_mode_usage).toEqual({ __increment__: 1 })
    expect(schoolWeekly.payload).not.toHaveProperty("teacher_hash")
  })

  it("skips school aggregation when no school domain can be resolved", async () => {
    testState.email = ""
    testState.userData = {}
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: testState.uid,
      decodedToken: {
        uid: testState.uid,
        email: null,
      },
      firestore: createFirestoreStub(),
    } as never)

    const response = await POST(
      new Request("http://localhost/api/analytics/draft-interaction", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer token",
        },
        body: JSON.stringify({
          consent: true,
          event: {
            event_name: "reaction_prediction_generated",
            message_context: "parent_email",
            edit_depth: 0,
            time_context: "school_hours",
            workflow_type: "new_message",
            reaction_prediction: "defensive",
            timestamp: "2026-03-18T09:30:00.000Z",
          },
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(testState.analyticsEvents[0].teacher_hash).toBe(buildTeacherHash(testState.uid))
    expect(testState.analyticsEvents[0].school_hash).toBeNull()
    expect(testState.schoolWeeklyWrites).toHaveLength(0)
    expect(testState.teacherWeeklyWrites).toHaveLength(1)
  })
})
