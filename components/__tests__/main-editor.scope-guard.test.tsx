// @vitest-environment happy-dom

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MainEditor } from "@/components/main-editor"

type Locale = "en-GB" | "de-DE"
let mockLocale: Locale = "en-GB"

/**
 * Mock useLocale so MainEditor can render without LanguageProvider.
 */
vi.mock("@/hooks/use-locale", () => {
  const enStrings = {
    "editor.outOfScope.title": "Not generated",
    "editor.outOfScope.body": "This doesn't look like a school report or parent message.",
    "editor.outOfScope.helper": "Adjust the text or add context and try again.",
  }
  const deStrings = {
    "editor.outOfScope.title": "Nicht generiert",
    "editor.outOfScope.body":
      "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus. Zaza Draft hilft Ihnen bei professioneller schulischer Kommunikation.",
    "editor.outOfScope.helper": "Passen Sie den Text an oder fügen Sie Kontext hinzu und versuchen Sie es erneut.",
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
      json: async () => ({ success: true, data: { dismissed: true } }),
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
   * Many UIs treat non-2xx as “generic error”, and only display OUT_OF_SCOPE
   * when the response is 200 with an error code in JSON.
   *
   * So we return ok:true/status:200 but with a payload that clearly indicates OUT_OF_SCOPE.
   */
  if (full.includes("/api/draft/generate")) {
    const msg =
      mockLocale === "de-DE"
        ? "Das sieht nicht wie eine Elternnachricht oder ein Zeugnis-Kommentar aus."
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
})

function getPromptTextarea() {
  const el = document.querySelector("textarea")
  if (!el) throw new Error("Prompt textarea not found")
  return el as HTMLTextAreaElement
}

function clickGenerateButton() {
  // Your DOM often contains the raw i18n key "button.generate" (as in the failure output).
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
      const text = document.body.textContent ?? ""
      expect(text).toContain(expected)
    })

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
      const text = document.body.textContent ?? ""
      expect(text).toContain(expected)
    })

    expect(screen.queryByTestId("draft-output-body")).toBeNull()
  })
})
