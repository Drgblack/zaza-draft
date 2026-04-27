import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/admin/grant-pro/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockGetUserProfile = vi.fn()
const mockCanAssignRoles = vi.fn()
const mockGetUserByEmail = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message)
    }
  },
}))

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}))

vi.mock("@/lib/auth/roles", () => ({
  canAssignRoles: (...args: unknown[]) => mockCanAssignRoles(...args),
}))

vi.mock("@/lib/firebase/project-policy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/firebase/project-policy")>(
    "@/lib/firebase/project-policy",
  )
  return {
    ...actual,
    assertZazaDraftProject: (...args: unknown[]) => mockAssertZazaDraftProject(...args),
  }
})

function createFirestore(options?: { setError?: Error }) {
  const users = new Map<string, Record<string, unknown>>()

  return {
    users,
    firestore: {
      collection: (name: string) => ({
        doc: (uid: string) => ({
          set: vi.fn(async (data: Record<string, unknown>, mergeOptions?: { merge?: boolean }) => {
            if (name !== "users") {
              return
            }
            if (options?.setError) {
              throw options.setError
            }
            const current = users.get(uid) ?? {}
            users.set(uid, mergeOptions?.merge ? { ...current, ...data } : data)
          }),
        }),
      }),
    },
  }
}

async function callPost(
  body: Record<string, unknown>,
  overrides?: {
    firestore?: ReturnType<typeof createFirestore>["firestore"]
    uid?: string
  },
) {
  mockAuthorizeFirebaseRequest.mockResolvedValue({
    uid: overrides?.uid ?? "super-admin-uid",
    auth: {
      getUserByEmail: mockGetUserByEmail,
    },
    firestore: overrides?.firestore ?? createFirestore().firestore,
  })

  return POST(
    new Request("https://app.zazadraft.com/api/admin/grant-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )
}

describe("POST /api/admin/grant-pro", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockGetUserProfile.mockReset()
    mockCanAssignRoles.mockReset()
    mockGetUserByEmail.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockGetUserProfile.mockResolvedValue({ role: "super_admin" })
    mockCanAssignRoles.mockReturnValue(true)
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("grants Pro access for a valid super admin request", async () => {
    const { firestore, users } = createFirestore()
    mockGetUserByEmail.mockResolvedValue({ uid: "target-uid", email: "teacher@example.com" })

    const response = await callPost({ email: "teacher@example.com" }, { firestore })
    expect(response.status).toBe(200)

    const payload = await response.json()
    expect(payload).toEqual({
      success: true,
      uid: "target-uid",
      reason: "manual upgrade",
    })

    expect(mockGetUserByEmail).toHaveBeenCalledWith("teacher@example.com")
    expect(users.get("target-uid")).toMatchObject({
      plan: "pro",
      monthlyDraftLimit: 999,
      entitlements: {
        planOverride: "pro",
        reason: "manual upgrade",
        expiresAt: null,
      },
    })
  })

  it("grants Pro access with a custom influencer reason", async () => {
    const { firestore, users } = createFirestore()
    mockGetUserByEmail.mockResolvedValue({ uid: "target-uid", email: "teacher@example.com" })

    const response = await callPost(
      { email: "teacher@example.com", reason: "influencer" },
      { firestore },
    )
    expect(response.status).toBe(200)

    await expect(response.json()).resolves.toEqual({
      success: true,
      uid: "target-uid",
      reason: "influencer",
    })

    expect(users.get("target-uid")).toMatchObject({
      entitlements: {
        planOverride: "pro",
        reason: "influencer",
      },
    })
  })

  it("rejects non-admin callers", async () => {
    mockGetUserProfile.mockResolvedValue({ role: "teacher" })
    mockCanAssignRoles.mockReturnValue(false)

    const response = await callPost({ email: "teacher@example.com" })
    expect(response.status).toBe(403)

    const payload = await response.json()
    expect(payload.error.code).toBe("SUPER_ADMIN_REQUIRED")
  })

  it("rejects missing email", async () => {
    const response = await callPost({})
    expect(response.status).toBe(400)

    const payload = await response.json()
    expect(payload.error.code).toBe("EMAIL_REQUIRED")
  })

  it("returns 404 when the email is unknown", async () => {
    mockGetUserByEmail.mockRejectedValue({ code: "auth/user-not-found" })

    const response = await callPost({ email: "missing@example.com" })
    expect(response.status).toBe(404)

    const payload = await response.json()
    expect(payload.error.code).toBe("USER_NOT_FOUND")
  })

  it("returns 500 when Firestore update fails", async () => {
    const { firestore } = createFirestore({ setError: new Error("write failed") })
    mockGetUserByEmail.mockResolvedValue({ uid: "target-uid", email: "teacher@example.com" })

    const response = await callPost({ email: "teacher@example.com" }, { firestore })
    expect(response.status).toBe(500)

    const payload = await response.json()
    expect(payload.error.code).toBe("FIRESTORE_UPDATE_FAILED")
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "POST /api/admin/grant-pro",
      })
    })

    const response = await callPost({ email: "teacher@example.com" })
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
    expect(mockAuthorizeFirebaseRequest).not.toHaveBeenCalled()
  })
})
