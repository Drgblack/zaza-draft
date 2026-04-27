import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATCH } from "@/app/api/admin/set-plan/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockGetUserProfile = vi.fn()
const mockAssertZazaDraftProject = vi.fn()
const serverTimestampSentinel = { __type: "serverTimestamp" }
const deleteSentinel = { __type: "deleteField" }

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => serverTimestampSentinel,
    delete: () => deleteSentinel,
  },
}))

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

function createFirestore(initialUsers?: Record<string, Record<string, unknown>>) {
  const users = new Map(Object.entries(initialUsers ?? {}))

  return {
    users,
    firestore: {
      collection: (name: string) => ({
        doc: (uid: string) => ({
          set: vi.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
            if (name !== "users") {
              return
            }
            const current = users.get(uid) ?? {}
            users.set(uid, options?.merge ? { ...current, ...data } : data)
          }),
        }),
      }),
    },
  }
}

async function callPatch(
  body: Record<string, unknown>,
  options?: {
    requesterRole?: string
    authUser?: { uid: string; email?: string }
    firestoreUsers?: Record<string, Record<string, unknown>>
    targetRole?: string | null
  },
) {
  const { firestore, users } = createFirestore(options?.firestoreUsers)
  mockGetUserProfile.mockImplementation(async (uid: string) => {
    if (uid === "super-admin") {
      return { role: options?.requesterRole ?? "super_admin" }
    }
    return options?.targetRole ? { role: options.targetRole } : null
  })
  mockAuthorizeFirebaseRequest.mockResolvedValue({
    uid: "super-admin",
    firestore,
    auth: {
      getUserByEmail: vi.fn(async (email: string) => {
        const authUser = options?.authUser ?? { uid: "target-uid", email }
        if (authUser.email && authUser.email.toLowerCase() === email.toLowerCase()) {
          return authUser
        }
        const error = Object.assign(new Error("User not found"), { code: "auth/user-not-found" })
        throw error
      }),
    },
  })

  const response = await PATCH(
    new Request("https://app.zazadraft.com/api/admin/set-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )

  return { response, users }
}

describe("PATCH /api/admin/set-plan", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockGetUserProfile.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("upgrades a user to pro", async () => {
    const { response, users } = await callPatch({
      email: "teacher@example.com",
      plan: "pro",
    })

    expect(response.status).toBe(200)
    expect(users.get("target-uid")).toMatchObject({
      plan: "pro",
      monthlyDraftLimit: 999,
      entitlements: {
        planOverride: "pro",
        reason: "manual upgrade",
        expiresAt: null,
      },
      updatedAt: serverTimestampSentinel,
    })
  })

  it("upgrades a user to pro with a custom reason", async () => {
    const { response, users } = await callPatch({
      email: "teacher@example.com",
      plan: "pro",
      reason: "school pilot",
    })

    expect(response.status).toBe(200)
    expect(users.get("target-uid")).toMatchObject({
      entitlements: {
        planOverride: "pro",
        reason: "school pilot",
      },
    })
  })

  it("downgrades a user to free and removes entitlement overrides", async () => {
    const { response, users } = await callPatch(
      {
        email: "teacher@example.com",
        plan: "free",
      },
      {
        firestoreUsers: {
          "target-uid": {
            plan: "pro",
            monthlyDraftLimit: 999,
            entitlements: {
              planOverride: "pro",
              reason: "manual upgrade",
              expiresAt: null,
            },
          },
        },
      },
    )

    expect(response.status).toBe(200)
    expect(users.get("target-uid")).toMatchObject({
      plan: "free",
      monthlyDraftLimit: 5,
      entitlements: {
        planOverride: deleteSentinel,
        reason: deleteSentinel,
        expiresAt: deleteSentinel,
      },
      planOverride: deleteSentinel,
      reason: deleteSentinel,
      expiresAt: deleteSentinel,
      updatedAt: serverTimestampSentinel,
    })
  })

  it("blocks non-admin users", async () => {
    const { response } = await callPatch(
      {
        email: "teacher@example.com",
        plan: "pro",
      },
      { requesterRole: "teacher" },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SUPER_ADMIN_REQUIRED" },
    })
  })

  it("rejects invalid plans", async () => {
    const { response } = await callPatch({
      email: "teacher@example.com",
      plan: "enterprise",
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_PLAN" },
    })
  })

  it("rejects missing email", async () => {
    const { response } = await callPatch({
      email: "",
      plan: "free",
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "EMAIL_REQUIRED" },
    })
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "PATCH /api/admin/set-plan",
      })
    })

    const { response } = await callPatch({
      email: "teacher@example.com",
      plan: "free",
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
  })

  it("rejects modifying a super_admin through the compatibility route", async () => {
    const { response } = await callPatch(
      {
        email: "teacher@example.com",
        plan: "free",
      },
      {
        authUser: { uid: "target-uid", email: "teacher@example.com" },
        targetRole: "super_admin",
      },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SUPER_ADMIN_PROTECTED" },
    })
  })
})
