import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockFetchDraftEntitlement = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    constructor(
      message: string,
      public statusCode: number,
    ) {
      super(message)
      this.name = "FirebaseAuthorizationError"
    }
  },
}))

vi.mock("@/lib/zaza-id/client", () => ({
  fetchDraftEntitlement: (...args: unknown[]) => mockFetchDraftEntitlement(...args),
  ZazaIdClientError: class ZazaIdClientError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public payload: unknown = null,
    ) {
      super(message)
      this.name = "ZazaIdClientError"
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

import { GET } from "@/app/api/entitlements/route"
import { FirebaseAuthorizationError } from "@/lib/firebase/server"
import { ZazaIdClientError } from "@/lib/zaza-id/client"

const entitledPayload = {
  userId: "uid-1",
  productKey: "draft" as const,
  hasAccess: true,
  accessType: "paid" as const,
  expiresAt: null,
  source: "direct" as const,
  sourceOrgId: null,
  licenceId: "lic_1",
}

beforeEach(() => {
  mockAssertZazaDraftProject.mockReset()
  mockAssertZazaDraftProject.mockReturnValue({
    projectId: "zaza-draft-app",
    overrideApplied: false,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("/api/entitlements proxy", () => {
  it("returns 401 when auth is missing", async () => {
    mockAuthorizeFirebaseRequest.mockRejectedValue(
      new FirebaseAuthorizationError("Missing authorization token", 401),
    )

    const response = await GET(new Request("http://localhost/api/entitlements"))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "UNAUTHORIZED",
        }),
      }),
    )
    expect(mockFetchDraftEntitlement).not.toHaveBeenCalled()
  })

  it("passes through entitlement payload for an authenticated request", async () => {
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      auth: null,
      firestore: null,
      storage: null,
    })
    mockFetchDraftEntitlement.mockResolvedValue(entitledPayload)

    const response = await GET(
      new Request("http://localhost/api/entitlements", {
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mockFetchDraftEntitlement).toHaveBeenCalledWith("token-123")
    expect(payload).toEqual({
      success: true,
      data: entitledPayload,
    })
  })

  it("maps upstream entitlement 401/403 to a local 403 response", async () => {
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      auth: null,
      firestore: null,
      storage: null,
    })
    mockFetchDraftEntitlement.mockRejectedValue(
      new ZazaIdClientError("Unauthorized", 401, { error: { code: "unauthorized" } }),
    )

    const response = await GET(
      new Request("http://localhost/api/entitlements", {
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "ENTITLEMENT_FORBIDDEN",
        }),
      }),
    )
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "GET /api/entitlements",
      })
    })

    const response = await GET(
      new Request("http://localhost/api/entitlements", {
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
    expect(mockAuthorizeFirebaseRequest).not.toHaveBeenCalled()
  })
})
