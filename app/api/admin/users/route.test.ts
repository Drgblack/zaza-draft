import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/admin/users/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockGetUserProfile = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message)
    }
  },
}))

vi.mock("@/lib/auth/get-user-role", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/get-user-role")>(
    "@/lib/auth/get-user-role",
  )
  return {
    ...actual,
    getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  }
})

vi.mock("@/lib/firebase/project-policy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/firebase/project-policy")>(
    "@/lib/firebase/project-policy",
  )
  return {
    ...actual,
    assertZazaDraftProject: (...args: unknown[]) => mockAssertZazaDraftProject(...args),
  }
})

function createSnapshot(records: Record<string, Record<string, unknown>>) {
  return {
    docs: Object.entries(records).map(([id, data]) => ({
      id,
      data: () => data,
    })),
  }
}

function createFirestore(options: {
  profiles?: Record<string, Record<string, unknown>>
  users?: Record<string, Record<string, unknown>>
  schoolLicences?: Record<string, Record<string, unknown>>
}) {
  const profiles = options.profiles ?? {}
  const users = options.users ?? {}
  const schoolLicences = options.schoolLicences ?? {}

  return {
    collection: (name: string) => ({
      get: vi.fn(async () => {
        if (name === "user_profiles") {
          return createSnapshot(profiles)
        }
        if (name === "users") {
          return createSnapshot(users)
        }
        if (name === "schoolLicences") {
          return createSnapshot(schoolLicences)
        }
        return createSnapshot({})
      }),
    }),
  }
}

async function callGet(
  query = "",
  options?: {
    firestore?: ReturnType<typeof createFirestore>
    authUsers?: Array<{ uid: string; email: string; metadata: { creationTime?: string } }>
  },
) {
  mockAuthorizeFirebaseRequest.mockResolvedValue({
    uid: "super-admin",
    firestore: options?.firestore ?? createFirestore({}),
    auth: {
      listUsers: vi.fn(async () => ({
        users: options?.authUsers ?? [],
        pageToken: undefined,
      })),
    },
  })

  return GET(new Request(`https://app.zazadraft.com/api/admin/users${query}`))
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockGetUserProfile.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockGetUserProfile.mockResolvedValue({ role: "super_admin" })
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("includes users granted Pro through users/{uid}", async () => {
    const firestore = createFirestore({
      users: {
        "target-uid": {
          email: "shoshoshaer@gmail.com",
          plan: "pro",
          monthlyDraftLimit: 999,
          entitlements: { planOverride: "pro", reason: "influencer" },
        },
      },
    })

    const response = await callGet("", { firestore })
    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uid: "target-uid",
          email: "shoshoshaer@gmail.com",
          plan: "pro",
          effectivePlan: "pro",
          planReason: "influencer",
          proReason: "influencer",
        }),
      ]),
    )
  })

  it("merges duplicate users by uid across profile, users, and auth sources", async () => {
    const firestore = createFirestore({
      profiles: {
        greg: {
          email: "greg@zazatechnologies.com",
          role: "super_admin",
          planStatus: "free",
          createdAt: 100,
        },
      },
      users: {
        greg: {
          email: "greg@zazatechnologies.com",
          plan: "pro",
          updatedAt: 200,
        },
      },
    })

    const response = await callGet("", {
      firestore,
      authUsers: [
        {
          uid: "greg",
          email: "greg@zazatechnologies.com",
          metadata: { creationTime: "2024-01-01T00:00:00.000Z" },
        },
      ],
    })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({
      uid: "greg",
      email: "greg@zazatechnologies.com",
      role: "super_admin",
      plan: "pro",
      effectivePlan: "pro",
    })
  })

  it("filters by search on email", async () => {
    const firestore = createFirestore({
      users: {
        a: { email: "alpha@example.com", plan: "free" },
        b: { email: "beta@example.com", plan: "free" },
      },
    })

    const response = await callGet("?search=beta", { firestore })
    const payload = await response.json()

    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].email).toBe("beta@example.com")
  })

  it("filters by role", async () => {
    const firestore = createFirestore({
      profiles: {
        a: { email: "alpha@example.com", role: "teacher", createdAt: 1 },
        b: { email: "beta@example.com", role: "admin", createdAt: 2 },
      },
    })

    const response = await callGet("?role=admin", { firestore })
    const payload = await response.json()

    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({ uid: "b", role: "admin" })
  })

  it("filters by effective plan including school domain licences", async () => {
    const firestore = createFirestore({
      users: {
        a: { email: "teacher@school.org", plan: "free" },
        b: { email: "teacher@example.com", plan: "free" },
      },
      schoolLicences: {
        "school.org": {
          domain: "school.org",
          plan: "pro",
          reason: "school pilot",
        },
      },
    })

    const response = await callGet("?plan=pro", { firestore })
    const payload = await response.json()

    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({
      uid: "a",
      effectivePlan: "pro",
      planReason: "school pilot",
    })
  })

  it("returns pagination metadata and sort order", async () => {
    const firestore = createFirestore({
      users: {
        a: { email: "charlie@example.com", plan: "free", createdAt: 300 },
        b: { email: "alpha@example.com", plan: "free", createdAt: 100 },
        c: { email: "bravo@example.com", plan: "free", createdAt: 200 },
      },
    })

    const response = await callGet("?sort=email_asc&page=2&pageSize=1", { firestore })
    const payload = await response.json()

    expect(payload.page).toBe(2)
    expect(payload.pageSize).toBe(1)
    expect(payload.total).toBe(3)
    expect(payload.totalPages).toBe(3)
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].email).toBe("bravo@example.com")
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "GET /api/admin/users",
      })
    })

    const response = await GET(new Request("https://app.zazadraft.com/api/admin/users"))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
  })
})
