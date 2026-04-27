import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/diagnostics/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockGetUserEntitlements = vi.fn()
const mockMergeDiagnosticsWithLastRun = vi.fn()
const mockGetConfiguredModelNames = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message)
    }
  },
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: (...args: unknown[]) => mockGetUserEntitlements(...args),
}))

vi.mock("@/lib/diagnostics/merge-last-run", () => ({
  mergeDiagnosticsWithLastRun: (...args: unknown[]) => mockMergeDiagnosticsWithLastRun(...args),
}))

vi.mock("@/lib/ai/provider", () => ({
  getConfiguredModelNames: () => mockGetConfiguredModelNames(),
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

describe("GET /api/diagnostics", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockGetUserEntitlements.mockReset()
    mockMergeDiagnosticsWithLastRun.mockReset()
    mockGetConfiguredModelNames.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
    mockGetUserEntitlements.mockResolvedValue({
      plan: "free",
      usage: { currentMonthUsage: 0, limit: 5, remaining: 5, unlimited: false },
    })
    mockMergeDiagnosticsWithLastRun.mockReturnValue({ lastModelUsed: "claude-sonnet-4" })
    mockGetConfiguredModelNames.mockReturnValue({
      primary: "claude-sonnet-4",
      fallback: "claude-haiku",
    })
  })

  it("loads diagnostics when the project is aligned", async () => {
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      firestore: {
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({ lastModelUsed: "claude-sonnet-4" }),
                }),
              }),
            }),
            get: async () => ({
              data: () => ({ lastDiagnosticsRunAt: null }),
            }),
          }),
        }),
      },
    })

    const response = await GET(new Request("http://localhost/api/diagnostics"))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        plan: "free",
      },
    })
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "GET /api/diagnostics",
      })
    })

    const response = await GET(new Request("http://localhost/api/diagnostics"))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
    expect(mockAuthorizeFirebaseRequest).not.toHaveBeenCalled()
  })
})
