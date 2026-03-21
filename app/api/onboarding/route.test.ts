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
        onboardingSkipped: false,
        onboarding: {
          role: "teacher",
          schoolType: "primary",
          region: "germany",
          tonePreference: "professional",
          useCase: "parent_messages",
          painPoints: [],
          version: "v1",
          completedAt: "2026-03-21T10:00:00.000Z",
        },
        onboardingProfile: {
          role: "teacher",
          schoolType: "primary",
          mainUseCase: "parent_messages",
          writingStressPoint: null,
          tonePreference: "professional",
          region: "germany",
        },
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
        onboardingSkipped: false,
        onboardingProfile: {
          role: "teacher",
          schoolType: "primary",
          mainUseCase: "parent_messages",
          writingStressPoint: null,
          tonePreference: "professional",
          region: "germany_austria_switzerland",
        },
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

    const response = await POST(
      new Request("https://example.com/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          action: "complete",
          profile: {
            role: "teacher",
            schoolType: "secondary",
            mainUseCase: "both",
            writingStressPoint: "tone",
            tonePreference: "warm",
            region: "usa_canada",
          },
        }),
      }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(userSet).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingCompleted: true,
        onboardingSkipped: false,
        onboarding: expect.objectContaining({
          role: "teacher",
          schoolType: "secondary",
          region: "usa_canada",
          tonePreference: "warm",
          useCase: "both",
          painPoints: ["tone"],
          version: "v1",
          completedAt: expect.anything(),
        }),
        onboardingProfile: {
          role: "teacher",
          schoolType: "secondary",
          mainUseCase: "both",
          writingStressPoint: "tone",
          tonePreference: "warm",
          region: "usa_canada",
        },
      }),
      { merge: true },
    )
    expect(json).toEqual({
      success: true,
      data: {
        onboardingCompleted: true,
        onboardingSkipped: false,
        onboardingProfile: {
          role: "teacher",
          schoolType: "secondary",
          mainUseCase: "both",
          writingStressPoint: "tone",
          tonePreference: "warm",
          region: "usa_canada",
        },
      },
    })
  })

  it("marks onboarding as completed when intentionally skipped", async () => {
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

    const response = await POST(
      new Request("https://example.com/api/onboarding", {
        method: "POST",
        body: JSON.stringify({ action: "skip" }),
      }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(userSet).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingCompleted: true,
        onboardingSkipped: true,
        onboarding: expect.objectContaining({
          role: null,
          schoolType: null,
          region: null,
          tonePreference: null,
          useCase: null,
          painPoints: [],
          version: "v1",
          completedAt: expect.anything(),
        }),
      }),
      { merge: true },
    )
    expect(json).toEqual({
      success: true,
      data: {
        onboardingCompleted: true,
        onboardingSkipped: true,
        onboardingProfile: {
          role: null,
          schoolType: null,
          mainUseCase: null,
          writingStressPoint: null,
          tonePreference: null,
          region: null,
        },
      },
    })
  })
})
