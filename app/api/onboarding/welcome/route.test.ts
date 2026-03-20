import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/onboarding/welcome/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { ensureUserDocument } from "@/lib/account-bootstrap"

const userGet = vi.fn()
const userSet = vi.fn()
const fetchMock = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

vi.mock("@/lib/account-bootstrap", () => ({
  ensureUserDocument: vi.fn(),
}))

vi.mock("server-only", () => ({}))

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

describe("/api/onboarding/welcome", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", fetchMock)
    process.env.BREVO_API_KEY = "test-brevo-key"
    process.env.BREVO_FROM_EMAIL = "hello@zazadraft.com"
    process.env.NEXT_PUBLIC_APP_URL = "https://app.zazadraft.com"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.BREVO_API_KEY
    delete process.env.BREVO_FROM_EMAIL
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it("sends the welcome email once and marks the user document", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => "",
    })
    vi.mocked(ensureUserDocument).mockResolvedValue({ created: true, firstLogin: true } as never)
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "user-1",
      decodedToken: {
        email: "teacher@example.com",
        name: "Teacher Example",
      },
      firestore: createFirestoreStub({
        email: "teacher@example.com",
        displayName: "Teacher Example",
        welcomeEmailSent: false,
      }),
    } as never)

    const response = await POST(
      new Request("https://example.com/api/onboarding/welcome", { method: "POST" }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
      }),
    )
    expect(userSet).toHaveBeenCalledWith(
      expect.objectContaining({
        welcomeEmailSent: true,
      }),
      { merge: true },
    )
    expect(json).toEqual({
      success: true,
      data: {
        sent: true,
        alreadySent: false,
      },
    })
  })

  it("does not resend the welcome email when it already exists", async () => {
    vi.mocked(ensureUserDocument).mockResolvedValue({ created: false, firstLogin: false } as never)
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "user-1",
      decodedToken: {
        email: "teacher@example.com",
        name: "Teacher Example",
      },
      firestore: createFirestoreStub({
        email: "teacher@example.com",
        displayName: "Teacher Example",
        welcomeEmailSent: true,
      }),
    } as never)

    const response = await POST(
      new Request("https://example.com/api/onboarding/welcome", { method: "POST" }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(userSet).not.toHaveBeenCalled()
    expect(json).toEqual({
      success: true,
      data: {
        sent: false,
        alreadySent: true,
      },
    })
  })
})
