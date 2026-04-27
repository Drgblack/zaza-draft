import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATCH } from "@/app/api/admin/users/role/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message)
    }
  },
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

function createFirestore(options?: {
  profiles?: Record<string, Record<string, unknown>>
  users?: Record<string, Record<string, unknown>>
}) {
  const initialProfiles = options?.profiles ?? {}
  const initialUsers = options?.users ?? {}
  const profiles = new Map(Object.entries(initialProfiles))
  const users = new Map(Object.entries(initialUsers))

  return {
    profiles,
    users,
    firestore: {
      collection: (name: string) => ({
        doc: (uid: string) => ({
          get: vi.fn(async () => ({
            exists: name === "user_profiles" ? profiles.has(uid) : users.has(uid),
            data: () => (name === "user_profiles" ? profiles.get(uid) : users.get(uid)),
          })),
          set: vi.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
            const target = name === "user_profiles" ? profiles : users
            const current = target.get(uid) ?? {}
            target.set(uid, options?.merge ? { ...current, ...data } : data)
          }),
        }),
      }),
    },
  }
}

async function callPatch(
  body: Record<string, unknown>,
  firestore: ReturnType<typeof createFirestore>["firestore"],
  auth: { getUser?: ReturnType<typeof vi.fn> } = {},
  uid = "super-admin",
) {
  mockAuthorizeFirebaseRequest.mockResolvedValue({
    uid,
    firestore,
    auth,
  })

  return PATCH(
    new Request("https://app.zazadraft.com/api/admin/users/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )
}

describe("PATCH /api/admin/users/role", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("updates a role when user_profiles/{uid} already exists", async () => {
    const { firestore, profiles } = createFirestore({
      profiles: {
        "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
        target: { role: "teacher", email: "teacher@example.com", createdAt: 123 },
      },
    })

    const response = await callPatch({ targetUid: "target", newRole: "admin" }, firestore)
    expect(response.status).toBe(200)
    expect(profiles.get("target")).toMatchObject({
      role: "admin",
      email: "teacher@example.com",
      createdAt: 123,
    })
  })

  it("creates user_profiles/{uid} when missing but the user exists in users/Auth data", async () => {
    const { firestore, profiles } = createFirestore({
      profiles: {
        "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
      },
      users: {
        target: { email: "shoshoshaer@gmail.com", plan: "pro" },
      },
    })

    const response = await callPatch(
      { targetUid: "target", newRole: "teacher" },
      firestore,
      {
        getUser: vi.fn(async () => ({
          uid: "target",
          email: "shoshoshaer@gmail.com",
        })),
      },
    )

    expect(response.status).toBe(200)
    expect(profiles.get("target")).toMatchObject({
      email: "shoshoshaer@gmail.com",
      role: "teacher",
    })
    expect(typeof profiles.get("target")?.createdAt).toBe("number")
  })

  it("blocks non-admin users", async () => {
    const { firestore } = createFirestore({
      profiles: {
        "non-admin": { role: "teacher", email: "teacher@example.com" },
        target: { role: "teacher", email: "target@example.com" },
      },
    })

    const response = await callPatch(
      { targetUid: "target", newRole: "admin" },
      firestore,
      {},
      "non-admin",
    )
    expect(response.status).toBe(403)
  })

  it("blocks assigning super_admin via UI", async () => {
    const { firestore } = createFirestore({
      profiles: {
        "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
        target: { role: "teacher", email: "teacher@example.com" },
      },
    })

    const response = await callPatch({ targetUid: "target", newRole: "super_admin" }, firestore)
    expect(response.status).toBe(400)
  })

  it("blocks self-demotion", async () => {
    const { firestore } = createFirestore({
      profiles: {
        "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
      },
    })

    const response = await callPatch(
      { targetUid: "super-admin", newRole: "teacher_free" },
      firestore,
    )
    expect(response.status).toBe(400)
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    const { firestore } = createFirestore({
      profiles: {
        "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
      },
    })
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "PATCH /api/admin/users/role",
      })
    })

    const response = await callPatch(
      { targetUid: "target", newRole: "teacher_free" },
      firestore,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
  })
})
