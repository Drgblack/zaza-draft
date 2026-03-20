import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET, POST } from "@/app/api/onboarding/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { ensureUserDocument } from "@/lib/account-bootstrap"

const userGet = vi.fn()
const userSet = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

vi.mock("@/lib/account-bootstrap", () => ({
  ensureUserDocument: vi.fn(),
}))

function createFirestoreStub(userData: Record<string, unknown>) {
  userGet.mockResolvedValue({
    data: () => userData,
  })
  userSet.mockResolvedValue(undefined)

  return {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: userGet,
        set: userSet,
      })),
    })),
  }
}

describe("/api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns onboarding state from the main user document", async () => {
    vi.mocked(ensureUserDocument).mockResolvedValue({ created: true, firstLogin: true } as never)
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "user-1",
      decodedToken: {
        email: "teacher@example.com",
        name: "Teacher Example",
      },
      firestore: createFirestoreStub({
        onboardingCompleted: false,
        welcomeEmailSent: false,
      }),
    } as never)

    const response = await GET(new Request("https://example.com/api/onboarding"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(ensureUserDocument).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({
        email: "teacher@example.com",
        displayName: "Teacher Example",
      }),
    )
    expect(json).toEqual({
      success: true,
      data: {
        onboardingCompleted: false,
        welcomeEmailSent: false,
        firstLogin: true,
      },
    })
  })

  it("marks onboarding as completed on the main user document", async () => {
    vi.mocked(ensureUserDocument).mockResolvedValue({ created: false, firstLogin: false } as never)
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "user-1",
      decodedToken: {
        email: "teacher@example.com",
        name: "Teacher Example",
      },
      firestore: createFirestoreStub({
        onboardingCompleted: false,
        welcomeEmailSent: true,
      }),
    } as never)

    const response = await POST(new Request("https://example.com/api/onboarding", { method: "POST" }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(userSet).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingCompleted: true,
      }),
      { merge: true },
    )
    expect(json).toEqual({
      success: true,
      data: {
        onboardingCompleted: true,
      },
    })
  })
})
