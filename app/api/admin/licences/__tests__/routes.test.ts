import type { Firestore } from "firebase-admin/firestore"

import { beforeEach, describe, expect, it, vi } from "vitest"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

import * as internalQa from "@/lib/auth/internal-qa"

import { POST as grantRoute } from "@/app/api/admin/licences/grant/route"
import { POST as revokeRoute } from "@/app/api/admin/licences/revoke/route"

const mockAuthorize = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: () => mockAuthorize(),
  FirebaseAuthorizationError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message)
    }
  },
}))

vi.mock("@/lib/auth/internal-qa", () => ({
  isAdminUid: vi.fn(),
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

function createMockFirestore() {
  const docMap = new Map<
    string,
    {
      set: ReturnType<typeof vi.fn<any, any>>
      delete: ReturnType<typeof vi.fn<any, any>>
    }
  >()

  const firestore = {
    collection: (name: string) => ({
      doc: (id: string) => {
        const key = `${name}/${id}`
        if (!docMap.has(key)) {
          docMap.set(key, {
            set: vi.fn(async () => undefined),
            delete: vi.fn(async () => undefined),
          })
        }
        return docMap.get(key)
      },
    }),
  }

  return { firestore: firestore as unknown as Firestore, docMap }
}

async function callRoute(route: (request: Request) => Promise<Response>, body: Record<string, unknown>) {
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return route(request)
}

describe("admin licence routes", () => {
  beforeEach(() => {
    mockAuthorize.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
    vi.mocked(internalQa.isAdminUid).mockReset()
  })

  it("rejects non-admins from grant", async () => {
    const { firestore } = createMockFirestore()
    mockAuthorize.mockResolvedValue({
      uid: "not-admin",
      decodedToken: { uid: "not-admin", admin: false },
      firestore,
      auth: null,
      storage: null,
    })
    vi.mocked(internalQa.isAdminUid).mockReturnValue(false)

    const response = await callRoute(grantRoute, { type: "uid", uid: "teacher", plan: "pro" })
    expect(response.status).toBe(403)
  })

  it("accepts a Firebase admin custom claim for grant", async () => {
    const { firestore, docMap } = createMockFirestore()
    mockAuthorize.mockResolvedValue({
      uid: "claimed-admin",
      decodedToken: { uid: "claimed-admin", admin: true },
      firestore,
      auth: null,
      storage: null,
    })
    vi.mocked(internalQa.isAdminUid).mockReturnValue(false)

    const response = await callRoute(grantRoute, { type: "uid", uid: "teacher", plan: "pro" })

    expect(response.status).toBe(200)
    expect(docMap.get("users/teacher")?.set).toHaveBeenCalled()
  })

  it("grants a uid entitlement", async () => {
    const { firestore, docMap } = createMockFirestore()
    mockAuthorize.mockResolvedValue({
      uid: "admin",
      decodedToken: { uid: "admin", admin: false },
      firestore,
      auth: null,
      storage: null,
    })
    vi.mocked(internalQa.isAdminUid).mockReturnValue(true)
    const future = new Date(Date.now() + 1_000_000).toISOString()

    const response = await callRoute(grantRoute, {
      type: "uid",
      uid: "teacher",
      plan: "pro",
      expiresAt: future,
      reason: "pilot",
    })

    expect(response.status).toBe(200)
    const doc = docMap.get("users/teacher")
    expect(doc?.set).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          planOverride: "pro",
          expiresAt: future,
          reason: "pilot",
        }),
      }),
      { merge: true },
    )
  })

  it("grants a domain licence", async () => {
    const { firestore, docMap } = createMockFirestore()
    mockAuthorize.mockResolvedValue({
      uid: "admin",
      decodedToken: { uid: "admin", admin: false },
      firestore,
      auth: null,
      storage: null,
    })
    vi.mocked(internalQa.isAdminUid).mockReturnValue(true)
    const response = await callRoute(grantRoute, {
      type: "domain",
      domain: "school.edu",
      plan: "pro",
      reason: "pilot",
    })

    expect(response.status).toBe(200)
    const doc = docMap.get("schoolLicences/school.edu")
    expect(doc?.set).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "school.edu",
        plan: "pro",
        reason: "pilot",
      }),
    )
  })

  it("revokes a uid entitlement", async () => {
    const { firestore, docMap } = createMockFirestore()
    mockAuthorize.mockResolvedValue({
      uid: "admin",
      decodedToken: { uid: "admin", admin: false },
      firestore,
      auth: null,
      storage: null,
    })
    vi.mocked(internalQa.isAdminUid).mockReturnValue(true)

    const response = await callRoute(revokeRoute, { type: "uid", uid: "teacher" })

    expect(response.status).toBe(200)
    const doc = docMap.get("users/teacher")
    expect(doc?.set).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlements: expect.objectContaining({
          planOverride: null,
        }),
      }),
      { merge: true },
    )
  })

  it("revokes a domain licence", async () => {
    const { firestore, docMap } = createMockFirestore()
    mockAuthorize.mockResolvedValue({
      uid: "admin",
      decodedToken: { uid: "admin", admin: false },
      firestore,
      auth: null,
      storage: null,
    })
    vi.mocked(internalQa.isAdminUid).mockReturnValue(true)

    const response = await callRoute(revokeRoute, { type: "domain", domain: "school.edu" })

    expect(response.status).toBe(200)
    const doc = docMap.get("schoolLicences/school.edu")
    expect(doc?.delete).toHaveBeenCalled()
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "POST /api/admin/licences/grant",
      })
    })

    const response = await callRoute(grantRoute, { type: "uid", uid: "teacher", plan: "pro" })
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
    expect(mockAuthorize).not.toHaveBeenCalled()
  })
})
