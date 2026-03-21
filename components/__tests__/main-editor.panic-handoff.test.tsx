// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { MainEditor } from "@/components/main-editor"

type Locale = "en-GB" | "de-DE"

let mockLocale: Locale = "en-GB"
let mockSearchParams = new URLSearchParams()

const setMockSearchParams = (search = "") => {
  mockSearchParams = new URLSearchParams(search)
}

const createSearchParamsShim = () => ({
  get: (key: string) => mockSearchParams.get(key),
  getAll: (key: string) => mockSearchParams.getAll(key),
  has: (key: string) => mockSearchParams.has(key),
  entries: () => mockSearchParams.entries(),
  keys: () => mockSearchParams.keys(),
  values: () => mockSearchParams.values(),
  toString: () => mockSearchParams.toString(),
  [Symbol.iterator]: () => mockSearchParams.entries(),
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => createSearchParamsShim(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", displayName: "Test Teacher", email: "test@example.com" },
    status: "authenticated",
    getIdToken: vi.fn().mockResolvedValue("token"),
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => ({
    prefs: {
      firstName: "Test",
      profilePhoto: null,
      preferredTone: "Friendly",
      preferredLanguage: "en",
      lastDocType: "email",
      streakCount: 0,
      lastActiveAt: new Date().toISOString(),
      signatureLine1: "Dr Greg Blackburn",
      signatureLine2: "",
      signatureLine3: "",
      autoAppendSignatureParentMessage: true,
      autoAppendSignatureReportComment: false,
    },
  }),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: mockLocale,
    setLocale: vi.fn(),
    t: (key: string, vars?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        "button.generate": "Generate",
        "editor.mode.parentMessage": "Parent message",
        "editor.mode.reportComment": "Report comment",
        "editor.mode.label": "Mode",
        "editor.mode.helper": "Choose the output mode",
        panicScanReturnNote: "Continuing from Panic Scan",
        "draft.generatedTitle": "Draft generated",
        "draft.button.copy": "Copy",
        "draft.button.copyShort": "Copy",
        "draft.button.edit": "Edit",
        "draft.button.moreActions": "More actions",
        "draft.button.more": "More",
        "draft.action.load": "Load",
        "draft.action.delete": "Delete",
        "draft.generatedDetails": `Generated in ${vars?.seconds ?? "0"}s`,
        "statusBar.words": `${vars?.count ?? 0} words`,
        "editor.history.subjectLabel": "Subject",
        "editor.history.title": "History",
        "editor.history.description": "History description",
        "editor.history.storage": "Stored locally",
        "editor.history.viewData": "View data",
        "editor.history.empty": "No history",
        "insights.unlimitedDrafts": "Unlimited drafts",
        "saved": "Saved",
        "saving": "Saving",
        "offlineQueued": "Queued",
      }
      if (key === "draft.modeLabel") {
        return `Mode: ${vars?.mode ?? ""}`
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock("@/lib/analytics", () => ({
  TRUST_FUNNEL_EVENTS: {
    onboardingBannerShown: "onboarding_banner_shown",
    onboardingCompleted: "onboarding_completed",
    onboardingDismissed: "onboarding_dismissed",
    firstDraftStarted: "first_draft_started",
    firstDraftGenerated: "first_draft_generated",
    paywallShown: "paywall_shown",
  },
  logClientEvent: vi.fn(),
  logClientEventOnce: vi.fn(),
  logDraftInteractionEvent: vi.fn(),
}))

const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
  const url = typeof input === "string" ? input : (input as Request).url
  const full = url.startsWith("http") ? url : `http://localhost${url}`

  if (full.includes("/api/account/status")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          usage: { plan: "pro", currentMonthUsage: 0, limit: null, remaining: null },
          isQaUser: false,
        },
      }),
    } as Response
  }

  if (full.includes("/api/onboarding")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          onboardingCompleted: true,
          welcomeEmailSent: true,
          firstLogin: false,
        },
      }),
    } as Response
  }

  if (full.includes("/api/snippets")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { snippets: [], nextCursor: null } }),
    } as Response
  }

  if (full.includes("/api/draft/generate")) {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const renderedBody = `Generated [${body.mode}]: ${body.situation}`
    const formattedDraft =
      body.mode === "report_comment"
        ? { paragraphs: [renderedBody] }
        : {
            subject: "Follow-up",
            paragraphs: ["Dear family,", renderedBody, "Kind regards,\nDr Greg Blackburn"],
          }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          generatedDraft: renderedBody,
          formattedDraft,
          metadata: {
            generationTime: 420,
            wordCount: renderedBody.split(/\s+/).length,
            toneUsed: body.tone,
            modeUsed: body.mode,
            generatedAt: new Date().toISOString(),
          },
          usage: { plan: "pro", currentMonthUsage: 1, limit: null, remaining: null },
          deescalationSummary: null,
          greeting: null,
          meta: {},
        },
      }),
    } as Response
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: {} }),
  } as Response
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
  mockLocale = "en-GB"
  setMockSearchParams("")
  window.sessionStorage.clear()
  window.localStorage.clear()
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  })
})

function seedPanicScanPrefill(cleaned: string, raw = "raw ocr parent message") {
  window.sessionStorage.setItem(
    "zazaDraftPrefill",
    JSON.stringify({
      cleaned,
      raw,
      greeting: {
        text: "Dear Jordan,",
        confidence: "HIGH",
        final: true,
        name: "Jordan",
        source: "resolved-name",
      },
    }),
  )
}

function getTextarea() {
  const textarea = document.querySelector("textarea")
  if (!textarea) {
    throw new Error("Prompt textarea not found")
  }
  return textarea as HTMLTextAreaElement
}

function getDraftGenerateBodies() {
  return fetchMock.mock.calls
    .filter(([input]) => {
      const url = typeof input === "string" ? input : (input as Request).url
      return String(url).includes("/api/draft/generate")
    })
    .map(([, init]) => JSON.parse(String(init?.body ?? "{}")))
}

describe("MainEditor Panic Scan handoff lifecycle", () => {
  it("clears Panic Scan context on mode switch and regenerates from the active report comment input", async () => {
    setMockSearchParams("panicScanReturn=1")
    seedPanicScanPrefill("Parent says they want an explanation about homework tonight.")

    render(<MainEditor />)

    await waitFor(() => {
      expect(getTextarea().value).toContain("Parent says they want an explanation")
    })

    expect(screen.getByText("Continuing from Panic Scan")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        "Generated [parent_message]: Parent says they want an explanation about homework tonight.",
      )
    })

    fireEvent.click(screen.getByRole("tab", { name: "Report comment" }))

    expect(screen.queryByText("Continuing from Panic Scan")).not.toBeInTheDocument()
    expect(screen.queryByTestId("draft-output-body")).not.toBeInTheDocument()

    fireEvent.change(getTextarea(), {
      target: {
        value:
          "Report comment: Alex contributes more steadily in discussion and works with greater independence.",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        "Generated [report_comment]: Report comment: Alex contributes more steadily in discussion and works with greater independence.",
      )
    })

    const bodies = getDraftGenerateBodies()
    expect(bodies.at(-1)?.mode).toBe("report_comment")
    expect(bodies.at(-1)?.situation).toBe(
      "Report comment: Alex contributes more steadily in discussion and works with greater independence.",
    )
    expect(bodies.at(-1)?.situationRaw).toBe(
      "Report comment: Alex contributes more steadily in discussion and works with greater independence.",
    )
  })

  it("drops Panic Scan handoff metadata after fresh manual edits before generating", async () => {
    setMockSearchParams("panicScanReturn=1")
    seedPanicScanPrefill("Parent screenshot about reading concerns.")

    render(<MainEditor />)

    await waitFor(() => {
      expect(getTextarea().value).toBe("Parent screenshot about reading concerns.")
    })

    fireEvent.change(getTextarea(), {
      target: {
        value: "Parent message: Sam has settled better this week and I will keep you updated next week.",
      },
    })

    expect(screen.queryByText("Continuing from Panic Scan")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        "Generated [parent_message]: Parent message: Sam has settled better this week and I will keep you updated next week.",
      )
    })

    const body = getDraftGenerateBodies().at(-1)
    expect(body?.situation).toBe(
      "Parent message: Sam has settled better this week and I will keep you updated next week.",
    )
    expect(body?.situationRaw).toBe(
      "Parent message: Sam has settled better this week and I will keep you updated next week.",
    )
    expect(body?.greeting).toBeUndefined()
  })

  it("allows dismissing the Panic Scan handoff banner without changing the prefixed text", async () => {
    setMockSearchParams("panicScanReturn=1")
    seedPanicScanPrefill("Parent screenshot asking for a call tomorrow.")

    render(<MainEditor />)

    await waitFor(() => {
      expect(screen.getByText("Continuing from Panic Scan")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Panic Scan handoff" }))

    expect(screen.queryByText("Continuing from Panic Scan")).not.toBeInTheDocument()
    expect(getTextarea().value).toBe("Parent screenshot asking for a call tomorrow.")
  })
})
