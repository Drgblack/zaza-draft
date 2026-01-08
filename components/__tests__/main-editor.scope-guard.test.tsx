// @vitest-environment happy-dom

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MainEditor } from "@/components/main-editor"

type Locale = "en-GB" | "de-DE"
let mockLocale: Locale = "en-GB"
let mockOnboardingDismissed = true

/**
 * Mock useLocale so MainEditor can render without LanguageProvider.
 */
vi.mock("@/hooks/use-locale", () => {
  const enStrings = {
    "editor.outOfScope.title": "Not generated",
    "editor.outOfScope.body": "This doesn't look like a school report or parent message.",
    "editor.outOfScope.helper": "Adjust the text or add context and try again.",
    "welcome.dontShowAgain": "Don't show this again",
  }
  const deStrings = {
    "editor.outOfScope.title": "Nicht generiert",
    "editor.outOfScope.body":
      "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus. Zaza Draft hilft Ihnen bei professioneller schulischer Kommunikation.",
    "editor.outOfScope.helper": "Passen Sie den Text an oder fügen Sie Kontext hinzu und versuchen Sie es erneut.",
    "welcome.dontShowAgain": "Nicht mehr anzeigen",
  }
  const t = (key: string) => {
    const localeStrings = mockLocale === "de-DE" ? deStrings : enStrings
    return localeStrings[key] ?? key
  }
  return {
    useLocale: () => ({
      locale: mockLocale,
      t,
      setLocale: vi.fn(),
      isGerman: mockLocale === "de-DE",
    }),
  }
})

/**
 * Mock useAuth so MainEditor can render without AuthProvider.
 * IMPORTANT: MainEditor calls both getIdToken() and signOut(), so the mock must expose them.
 */
vi.mock("@/hooks/use-auth", () => {
  const getIdToken = vi.fn(async () => "test-token")
  const signOut = vi.fn(async () => {})
  const user = {
    uid: "test-uid",
    email: "test@example.com",
    displayName: "Test User",
  }

  return {
    useAuth: () => ({
      user,
      getIdToken,
      signOut,
      isLoading: false,
      loading: false,
      isAuthenticated: true,
      isAuthed: true,
      isPro: false,
      isQa: false,
      signIn: vi.fn(),
      logout: vi.fn(),
    }),
  }
})

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

/**
 * Fetch mock that works in node/happy-dom when code calls fetch("/api/...")
 * Normalise to http://localhost for any relative path.
 */
const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
  const url = typeof input === "string" ? input : (input as any)?.url ?? String(input)
  const full = url.startsWith("http") ? url : `http://localhost${url}`

  if (full.includes("/api/account/status")) {
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
    } as any
  }

  if (full.includes("/api/onboarding")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { dismissed: mockOnboardingDismissed } }),
    } as any
  }

  if (full.includes("/api/snippets/history")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { items: [] } }),
    } as any
  }

  /**
   * IMPORTANT:
   * Many UIs treat non-2xx as "generic error", and only display OUT_OF_SCOPE
   * when the response is 200 with an error code in JSON.
   *
   * So we return ok:true/status:200 but with a payload that clearly indicates OUT_OF_SCOPE.
   */
  if (full.includes("/api/draft/generate")) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const situation =
      typeof body?.situation === "string" ? body.situation.toLowerCase() : ""
    if (situation.includes("reading progress")) {
      const success = {
        success: true,
        data: {
          generatedDraft: "Dear parent, here's the latest reading progress update for Jamie.",
          formattedDraft: {
            subject: "Reading Update",
            paragraphs: [
              "Jamie has been participating well in guided reading sessions and is improving fluency.",
              "Please encourage them to continue reading at home to reinforce comprehension skills.",
            ],
          },
          metadata: {
            wordCount: 78,
            toneUsed: "warm",
            modelUsed: "model-v1",
            pronounPreference: "auto",
            pronounResolution: {
              resolvedPreference: "auto",
              reason: null,
              source: null,
            },
            generationTime: 520,
            tokensUsed: 320,
            safetyFlags: [],
            generatedAt: new Date().toISOString(),
            requestedAt: new Date().toISOString(),
            contextUsed: {},
            signatureBlock: null,
          },
          meta: {
            inputReframed: false,
            inputReframedTier: null,
            latencyMs: 520,
            usedFallback: false,
            errorCode: null,
          },
          usage: {
            plan: "free",
            currentMonthUsage: 3,
            limit: 10,
            remaining: 7,
          },
          deescalationSummary: null,
        },
      }
      return {
        ok: true,
        status: 200,
        json: async () => success,
      } as any
    }

    const msg =
      mockLocale === "de-DE"
        ? "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus."
        : "This doesn't look like a school report or parent message."
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        ok: false,
        code: "OUT_OF_SCOPE",
        message: msg,
        error: { code: "OUT_OF_SCOPE", message: msg },
      }),
    } as any
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: {} }),
  } as any
})

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockOnboardingDismissed = true
})

function getPromptTextarea() {
  const el = document.querySelector("textarea")
  if (!el) throw new Error("Prompt textarea not found")
  return el as HTMLTextAreaElement
}

function clickGenerateButton() {
  const btn =
    screen.queryByRole("button", { name: /button\.generate/i }) ??
    screen.queryByRole("button", { name: /generate/i }) ??
    screen.queryByRole("button", { name: /entwurf/i }) ??
    screen.queryByRole("button", { name: /draft/i }) ??
    screen.getAllByRole("button")[0]

  fireEvent.click(btn)
}

describe("MainEditor scope guard notice", () => {
  it("shows out-of-scope message and never renders DraftOutput (EN)", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "How do I bake toffee muffins?" } })

    clickGenerateButton()

    const expected = "This doesn't look like a school report or parent message."

    await waitFor(() => {
      const noticeBody = screen.getByText(expected, { exact: false })
      expect(noticeBody.textContent).toContain(expected)
    })

    const noticeBody = screen.getByText(expected, { exact: false })
    expect(noticeBody.textContent).not.toContain("editor.")

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })

  it("shows out-of-scope message (DE)", async () => {
    mockLocale = "de-DE"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "Wie backe ich Toffee-Muffins?" } })

    clickGenerateButton()

    const expected = "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus."

    await waitFor(() => {
      const noticeBody = screen.getByText(expected, { exact: false })
      expect(noticeBody.textContent).toContain(expected)
    })

    const noticeBody = screen.getByText(expected, { exact: false })
    expect(noticeBody.textContent).not.toContain("editor.")

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })

  it("renders welcome checkbox label in German", async () => {
    mockLocale = "de-DE"
    mockOnboardingDismissed = false

    render(<MainEditor />)

    await waitFor(() => {
      expect(screen.queryByText("Nicht mehr anzeigen")).not.toBeNull()
    })

    expect(screen.queryByText("Don't show this again")).toBeNull()
  })

  it("removes a previously generated draft after an out-of-scope prompt", async () => {
    mockLocale = "en-GB"

    render(<MainEditor />)

    const prompt = getPromptTextarea()
    fireEvent.change(prompt, { target: { value: "Write a parent message about reading progress." } })

    clickGenerateButton()

    await waitFor(() => {
      expect(screen.queryByTestId("draft-output-body")).not.toBeNull()
    })

    fireEvent.change(prompt, { target: { value: "What is the capital of France?" } })
    clickGenerateButton()

    const expected = "This doesn't look like a school report or parent message."
    await waitFor(() => {
      const noticeBody = screen.getByText(expected, { exact: false })
      expect(noticeBody.textContent).toContain(expected)
      expect(noticeBody.textContent).not.toContain("editor.")
    })

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })
})
