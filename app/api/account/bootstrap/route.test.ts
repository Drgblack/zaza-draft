import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/account/bootstrap/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockEnsureUserDocument = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
}))

vi.mock("@/lib/account-bootstrap", () => ({
  ensureUserDocument: (...args: unknown[]) => mockEnsureUserDocument(...args),
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

describe("POST /api/account/bootstrap", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
    mockEnsureUserDocument.mockReset()
    mockAssertZazaDraftProject.mockReset()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("bootstraps the account when the project is aligned", async () => {
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      decodedToken: {
        email: "teacher@example.com",
        name: "Teacher Example",
      },
      firestore: {},
    })
    mockEnsureUserDocument.mockResolvedValue({
      created: true,
      firstLogin: true,
      role: "teacher_free",
    })

    const response = await POST(
      new Request("http://localhost/api/account/bootstrap", {
        method: "POST",
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        created: true,
        firstLogin: true,
      },
    })
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "POST /api/account/bootstrap",
      })
    })

    const response = await POST(
      new Request("http://localhost/api/account/bootstrap", {
        method: "POST",
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
    expect(mockAuthorizeFirebaseRequest).not.toHaveBeenCalled()
  })
})
