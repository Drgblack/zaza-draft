// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { vi } from "vitest"

import { MainEditor } from "@/components/main-editor"

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { displayName: "Teacher" },
    getIdToken: async () => "token",
    signOut: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => key,
    formatDate: () => "",
    formatNumber: () => "",
  }),
}))

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => ({
    prefs: {
      firstName: "Sarah",
      profilePhoto: null,
      preferredTone: "Professional",
      preferredLanguage: "en",
      lastDocType: "report",
      streakCount: 0,
      lastActiveAt: new Date().toISOString(),
      signatureLine1: "Sarah Teacher",
      signatureLine2: undefined,
      signatureLine3: undefined,
      autoAppendSignatureParentMessage: true,
      autoAppendSignatureReportComment: false,
    },
    setPreferredTone: vi.fn(),
    setPreferredLanguage: vi.fn(),
    setLastDocType: vi.fn(),
    incrementStreak: vi.fn(),
    updatePrefs: vi.fn(),
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(() => Promise.resolve()),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/lib/analytics", () => ({
  logClientEvent: vi.fn(),
}))

describe("MainEditor scope guard notice", () => {
  const originalFetch = global.fetch
  const outOfScopeMessage =
    "This doesn't look like a school report or parent message."

  beforeEach(() => {
    const mockFetch = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url
      if (url.includes("/api/account/status")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              usage: { plan: "free", currentMonthUsage: 0, limit: 10, remaining: 10 },
              isQaUser: false,
            },
          }),
        }
      }

      if (url.includes("/api/onboarding")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { dismissed: true } }),
        }
      }

      if (url.includes("/api/draft/generate")) {
        return {
          ok: false,
          status: 422,
          json: async () => ({
            success: false,
            ok: false,
            code: "OUT_OF_SCOPE",
            message: outOfScopeMessage,
            error: { code: "OUT_OF_SCOPE", message: outOfScopeMessage },
          }),
        }
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      }
    })
    ;(globalThis as unknown as { fetch?: unknown }).fetch = mockFetch
    if (typeof window !== "undefined") {
      window.fetch = mockFetch as typeof window.fetch
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it("shows the info notice and never renders DraftOutput when the scope guard fires", async () => {
    render(<MainEditor />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const promptInput = screen.getByLabelText(/Describe the situation/i)
    fireEvent.change(promptInput, { target: { value: "What is the capital of France?" } })

    const generateButton = screen.getByRole("button", { name: /button.generate/i })
    fireEvent.click(generateButton)

    await screen.findByText("editor.notice.scopeGuard.title")
    expect(screen.getByText(outOfScopeMessage)).toBeTruthy()
    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })
})
