import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATCH } from "@/app/api/admin/users/role/route"

const mockAuthorizeFirebaseRequest = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message)
    }
  },
}))

function createFirestore(initialProfiles: Record<string, Record<string, unknown>>) {
  const profiles = new Map(Object.entries(initialProfiles))

  return {
    firestore: {
      collection: (name: string) => ({
        doc: (uid: string) => ({
          get: vi.fn(async () => ({
            exists: profiles.has(uid),
            data: () => profiles.get(uid),
          })),
          set: vi.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
            const current = profiles.get(uid) ?? {}
            profiles.set(uid, options?.merge ? { ...current, ...data } : data)
          }),
        }),
      }),
    },
  }
}

async function callPatch(
  body: Record<string, unknown>,
  firestore: ReturnType<typeof createFirestore>["firestore"],
  uid = "super-admin",
) {
  mockAuthorizeFirebaseRequest.mockResolvedValue({
    uid,
    firestore,
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
  })

  it("blocks assigning super_admin via UI", async () => {
    const { firestore } = createFirestore({
      "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
      target: { role: "teacher", email: "teacher@example.com" },
    })

    const response = await callPatch({ targetUid: "target", newRole: "super_admin" }, firestore)
    expect(response.status).toBe(400)
  })

  it("blocks self-demotion", async () => {
    const { firestore } = createFirestore({
      "super-admin": { role: "super_admin", email: "greg@zazadraft.com" },
    })

    const response = await callPatch(
      { targetUid: "super-admin", newRole: "teacher_free" },
      firestore,
    )
    expect(response.status).toBe(400)
  })
})
