import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATCH } from "@/app/api/admin/users/plan/route"
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

function createFirestore(options?: {
  profiles?: Record<string, Record<string, unknown>>
  users?: Record<string, Record<string, unknown>>
}) {
  const initialProfiles = options?.profiles ?? {}
  const initialUsers = options?.users ?? {}
  const profiles = new Map(Object.entries(initialProfiles))
  const users = new Map(Object.entries(initialUsers))

  return {
    users,
    firestore: {
      collection: (name: string) => ({
        doc: (uid: string) => ({
          get: vi.fn(async () => ({
            exists: name === "user_profiles" ? profiles.has(uid) : users.has(uid),
            data: () => (name === "user_profiles" ? profiles.get(uid) : users.get(uid)),
          })),
          set: vi.fn(async (data: Record<string, unknown>, mergeOptions?: { merge?: boolean }) => {
            if (name !== "users") {
              return
            }
            const current = users.get(uid) ?? {}
            users.set(uid, mergeOptions?.merge ? { ...current, ...data } : data)
          }),
        }),
      }),
    },
  }
}

async function callPatch(
  body: Record<string, unknown>,
  options?: {
    firestoreData?: Parameters<typeof createFirestore>[0]
    requesterRole?: string
    targetProfile?: Record<string, unknown> | null
  },
) {
  const { firestore, users } = createFirestore(options?.firestoreData)

  mockAuthorizeFirebaseRequest.mockResolvedValue({
    uid: "super-admin",
    firestore,
  })

  mockGetUserProfile.mockImplementation(async (uid: string) => {
    if (uid === "super-admin") {
      return { role: options?.requesterRole ?? "super_admin" }
    }
    return options?.targetProfile ?? null
  })

  const response = await PATCH(
    new Request("https://app.zazadraft.com/api/admin/users/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )

  return { response, users }
}

describe("PATCH /api/admin/users/plan", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockGetUserProfile.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("upgrades free users to pro", async () => {
    const { response, users } = await callPatch(
      { targetUid: "target", plan: "pro", reason: "school pilot" },
      { firestoreData: { users: { target: { email: "teacher@example.com", plan: "free" } } } },
    )

    expect(response.status).toBe(200)
    expect(users.get("target")).toMatchObject({
      plan: "pro",
      monthlyDraftLimit: 999,
      entitlements: {
        planOverride: "pro",
        reason: "school pilot",
        expiresAt: null,
      },
      updatedAt: serverTimestampSentinel,
    })
  })

  it("downgrades pro users to free and clears active override reason", async () => {
    const { response, users } = await callPatch(
      { targetUid: "target", plan: "free" },
      {
        firestoreData: {
          users: {
            target: {
              email: "teacher@example.com",
              plan: "pro",
              entitlements: { planOverride: "pro", reason: "manual upgrade", expiresAt: null },
            },
          },
        },
      },
    )

    expect(response.status).toBe(200)
    expect(users.get("target")).toMatchObject({
      plan: "free",
      monthlyDraftLimit: 5,
      entitlements: {
        planOverride: deleteSentinel,
        reason: deleteSentinel,
        expiresAt: deleteSentinel,
      },
    })
  })

  it("rejects non-super-admin callers", async () => {
    const { response } = await callPatch(
      { targetUid: "target", plan: "pro" },
      {
        requesterRole: "teacher",
        firestoreData: { users: { target: { email: "teacher@example.com" } } },
      },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SUPER_ADMIN_REQUIRED" },
    })
  })

  it("rejects modifying a super_admin", async () => {
    const { response } = await callPatch(
      { targetUid: "target", plan: "free" },
      {
        firestoreData: { users: { target: { email: "admin@example.com", plan: "pro" } } },
        targetProfile: { role: "super_admin" },
      },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SUPER_ADMIN_PROTECTED" },
    })
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "PATCH /api/admin/users/plan",
      })
    })

    const { response } = await callPatch({ targetUid: "target", plan: "pro" })
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
  })
})
