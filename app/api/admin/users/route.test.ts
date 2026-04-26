import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/admin/users/route"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockGetUserProfile = vi.fn()

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
}) {
  const profiles = options.profiles ?? {}
  const users = options.users ?? {}

  return {
    collection: (name: string) => ({
      get: vi.fn(async () => {
        if (name === "user_profiles") {
          return createSnapshot(profiles)
        }
        if (name === "users") {
          return createSnapshot(users)
        }
        return createSnapshot({})
      }),
    }),
  }
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockGetUserProfile.mockReset()
    mockGetUserProfile.mockResolvedValue({ role: "super_admin" })
  })

  it("includes users granted Pro through users/{uid}", async () => {
    const firestore = createFirestore({
      users: {
        "target-uid": {
          email: "shoshoshaer@gmail.com",
          plan: "pro",
          monthlyDraftLimit: 999,
          entitlements: { planOverride: "pro" },
        },
      },
    })

    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "super-admin",
      firestore,
      auth: {
        listUsers: vi.fn(async () => ({ users: [], pageToken: undefined })),
      },
    })

    const response = await GET(new Request("https://app.zazadraft.com/api/admin/users"))
    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uid: "target-uid",
          email: "shoshoshaer@gmail.com",
          plan: "pro",
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

    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "super-admin",
      firestore,
      auth: {
        listUsers: vi.fn(async () => ({
          users: [
            {
              uid: "greg",
              email: "greg@zazatechnologies.com",
              metadata: { creationTime: "2024-01-01T00:00:00.000Z" },
            },
          ],
          pageToken: undefined,
        })),
      },
    })

    const response = await GET(new Request("https://app.zazadraft.com/api/admin/users"))
    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.users).toHaveLength(1)
    expect(payload.users[0]).toMatchObject({
      uid: "greg",
      email: "greg@zazatechnologies.com",
      role: "super_admin",
      plan: "pro",
    })
  })
})
