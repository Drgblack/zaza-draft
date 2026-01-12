import { describe, it, expect, vi, beforeEach } from "vitest"

// IMPORTANT: define mocks inside the factory to avoid hoisting ReferenceError
vi.mock("@/lib/firebase/server", () => {
  return {
    authorizeFirebaseRequest: vi.fn(async () => ({
      uid: "test-uid",
      token: { uid: "test-uid" },
    })),
    FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
      statusCode: number
      constructor(message = "Unauthorised", statusCode = 401) {
        super(message)
        this.statusCode = statusCode
      }
    },
  }
})

vi.mock("@/lib/firebase/admin", () => {
  return {
    getFirebaseAdmin: vi.fn(() => ({
      auth: {},
      firestore: {},
    })),
  }
})

describe("GET /api/insights/summary", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("returns a JSON response (stub/empty is acceptable)", async () => {
    const { GET } = await import("@/app/api/insights/summary/route")
    const res = await GET(new Request("http://localhost/api/insights/summary"))
    expect(res).toBeTruthy()
    expect(res.headers.get("content-type") || "").toContain("application/json")
    const json = await res.json()
    // Accept either your stub shape or a real summary later
    expect(json).toHaveProperty("success")
  })
})
