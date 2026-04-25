import "@testing-library/jest-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { MainEditor } from "@/components/main-editor"

type Locale = "en-GB" | "de-DE"
type DraftGenerateScenario = "success" | "json_error" | "non_json_error"

let mockLocale: Locale = "en-GB"
let mockSearchParams = new URLSearchParams()
let draftGenerateScenario: DraftGenerateScenario = "success"

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
        "editor.mode.helper": "Choose your message type",
        "editor.mode.documentationHelper": "Documentation Mode is active for this result.",
        "editor.mode.switchToDocumentation": "Switch to Documentation Mode",
        "editor.mode.switchToMessage": "Switch to Message Mode",
        "editor.inputMode.heading": "What are you working with?",
        "editor.inputMode.parentMessage": "Parent message",
        "editor.inputMode.teacherDraft": "My draft",
        "editor.inputMode.parentMessageDescription": "I need to reply to this",
        "editor.inputMode.teacherDraftDescription": "Improve what I’ve written",
        "editor.inputMode.parentMessagePlaceholder": "Paste the parent’s message here…",
        "editor.inputMode.teacherDraftPlaceholder":
          "Paste your draft reply… I’ll make it calmer and safer",
        "editor.inputMode.parentMessagePromise":
          "I’ll write a reply that’s calm, professional, and hard to misread.",
        "editor.inputMode.teacherDraftPromise":
          "I’ll improve your message without changing what you want to say.",
        "editor.inputMode.mismatch.parentMessage": "This looks like a parent message.",
        "editor.inputMode.mismatch.teacherDraft": "This looks like your draft reply.",
        "editor.inputMode.mismatch.switchToParentMessage": "Switch to Parent message",
        "editor.inputMode.mismatch.switchToTeacherDraft": "Switch to My draft",
        "draft.generatedTitle": "Draft generated",
        "draft.documentation.badge": "Documentation Mode",
        "draft.documentation.label": "Mode:",
        "draft.documentation.description": "Rewritten as a neutral incident record.",
        "draft.button.copy": "Copy to Clipboard",
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
        "draft.teacherControl.reassurance":
          "You review every message before anything is sent. Draft never sends messages for you.",
        "homeSafeDraftTitle": "Safe Draft",
        "panicScanTitle": "Panic Scan",
        "editor.advanced.summaryTitle": "Advanced options",
        "editor.advanced.summaryHint": "Tone, language, and extra context",
        "editor.advanced.toneSection": "Tone",
        "editor.advanced.languageSection": "Language and voice",
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
    draftCopied: "draft_copied",
    draftExported: "draft_exported",
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
    if (draftGenerateScenario === "json_error") {
      const errorPayload = {
        success: false,
        error: {
          code: "AI_GENERATION_FAILED",
          message: "Draft generation is temporarily unavailable. Please try again in a few seconds.",
        },
      }
      return {
        ok: false,
        status: 503,
        text: async () => JSON.stringify(errorPayload),
      } as Response
    }

    if (draftGenerateScenario === "non_json_error") {
      return {
        ok: false,
        status: 503,
        text: async () => "service unavailable",
      } as Response
    }

    const documentationMode = Boolean(body.documentationMode)
    const renderedBody = documentationMode
      ? `Documentation [${body.mode}]: ${body.situation}`
      : `Generated [${body.mode}]: ${body.situation}`
    const formattedDraft =
      documentationMode || body.mode === "report_comment"
        ? { paragraphs: [renderedBody] }
        : {
            subject: "Follow-up",
            paragraphs: ["Dear family,", renderedBody, "Kind regards,\nDr Greg Blackburn"],
          }

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
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
            safetyAnalysis: {
              documentationModeAvailable: true,
              triggeredSignals: [],
              professionalRiskFlags: [],
              riskLevel: "low",
              reactionForecast: {
                hostile: 5,
                defensive: 10,
                confused: 15,
                concerned: 30,
                collaborative: 40,
              },
            },
            outputSafetyAnalysis: null,
            documentationModeActive: documentationMode,
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
  draftGenerateScenario = "success"
  setMockSearchParams("")
  window.sessionStorage.clear()
  window.localStorage.clear()
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

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

function getModeTablist() {
  return screen.getByRole("tablist", { name: "Mode" })
}

function getInputTypeTablist() {
  return screen.getByRole("tablist", { name: "What are you working with?" })
}

describe("MainEditor mode switching", () => {
  it("switches from Message Mode to Documentation Mode with consistent visible mode state", async () => {
    render(<MainEditor />)

    fireEvent.change(getTextarea(), {
      target: {
        value: "Parent message: I want to send a calm update about homework expectations and tomorrow's follow-up.",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        "Generated [parent_message]: Parent message: I want to send a calm update about homework expectations and tomorrow's follow-up.",
      )
    })

    expect(screen.getByText("Mode: Parent message")).toBeInTheDocument()
    expect(within(getModeTablist()).getByRole("tab", { name: "Parent message" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Switch to Documentation Mode" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Switch to Message Mode" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Switch to Documentation Mode" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        "Documentation [parent_message]: Parent message: I want to send a calm update about homework expectations and tomorrow's follow-up.",
      )
    })

    expect(screen.getAllByText("Documentation Mode").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("Documentation Mode is active for this result.")).toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Mode" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Switch to Documentation Mode" })).toBeNull()
    expect(screen.getByRole("button", { name: "Switch to Message Mode" })).toBeInTheDocument()
  })

  it("switches back from Documentation Mode to Message Mode and preserves the source input", async () => {
    const sourceText =
      "Parent message: I want to send a calm update about reading progress, note what I will check tomorrow, and confirm the next steps."

    render(<MainEditor />)

    fireEvent.change(getTextarea(), {
      target: { value: sourceText },
    })

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        `Generated [parent_message]: ${sourceText}`,
      )
    })

    fireEvent.click(screen.getByRole("button", { name: "Switch to Documentation Mode" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        `Documentation [parent_message]: ${sourceText}`,
      )
    })

    expect(getTextarea().value).toBe(sourceText)

    fireEvent.click(screen.getByRole("button", { name: "Switch to Message Mode" }))

    await waitFor(() => {
      expect(screen.getByTestId("draft-output-body")).toHaveTextContent(
        `Generated [parent_message]: ${sourceText}`,
      )
    })

    expect(screen.getByText("Mode: Parent message")).toBeInTheDocument()
    expect(within(getModeTablist()).getByRole("tab", { name: "Parent message" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Switch to Documentation Mode" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Switch to Message Mode" })).toBeNull()
    expect(getTextarea().value).toBe(sourceText)

    const bodies = getDraftGenerateBodies()
    expect(bodies.map((body) => body.documentationMode)).toEqual([false, true, false])
    expect(bodies.map((body) => body.situation)).toEqual([sourceText, sourceText, sourceText])
    expect(bodies.map((body) => body.mode)).toEqual([
      "parent_message",
      "parent_message",
      "parent_message",
    ])
  })

  it("passes the explicit parent-message input selection and lets the user switch to my draft", async () => {
    render(<MainEditor />)

    expect(screen.getByText("What are you working with?")).toBeInTheDocument()
    expect(screen.getByText("I need to reply to this")).toBeInTheDocument()
    expect(screen.getByText("Improve what I’ve written")).toBeInTheDocument()
    expect(getTextarea()).toHaveAttribute("placeholder", "Paste the parent’s message here…")
    expect(
      screen.getByText("I’ll write a reply that’s calm, professional, and hard to misread."),
    ).toBeInTheDocument()
    expect(within(getInputTypeTablist()).getByRole("tab", { name: "Parent message" })).toHaveAttribute(
      "aria-selected",
      "true",
    )

    fireEvent.change(getTextarea(), {
      target: {
        value:
          "Parent message: I want to send a calm update about homework expectations and tomorrow's follow-up.",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(getDraftGenerateBodies()).toHaveLength(1)
    })

    expect(getDraftGenerateBodies()[0]?.inputIntent).toBe("parent_message")
    expect(getDraftGenerateBodies()[0]?.parentMessageInputType).toBeUndefined()

    fireEvent.click(within(getInputTypeTablist()).getByRole("tab", { name: "My draft" }))

    expect(getTextarea()).toHaveAttribute(
      "placeholder",
      "Paste your draft reply… I’ll make it calmer and safer",
    )
    expect(
      screen.getByText("I’ll improve your message without changing what you want to say."),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem("zaza:parent-input-mode")).toBe("teacher_draft")

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(getDraftGenerateBodies()).toHaveLength(2)
    })

    expect(getDraftGenerateBodies()[1]?.inputIntent).toBe("teacher_draft")
    expect(getDraftGenerateBodies()[1]?.parentMessageInputType).toBeUndefined()
  })

  it("restores the last selected parent-message input mode from localStorage", async () => {
    window.localStorage.setItem("zaza:parent-input-mode", "teacher_draft")

    render(<MainEditor />)

    await waitFor(() => {
      expect(within(getInputTypeTablist()).getByRole("tab", { name: "My draft" })).toHaveAttribute(
        "aria-selected",
        "true",
      )
    })

    expect(getTextarea()).toHaveAttribute(
      "placeholder",
      "Paste your draft reply… I’ll make it calmer and safer",
    )
    expect(
      screen.getByText("I’ll improve your message without changing what you want to say."),
    ).toBeInTheDocument()
  })

  it("shows a gentle suggestion when my draft is selected but the text looks like a parent email", async () => {
    render(<MainEditor />)

    fireEvent.click(within(getInputTypeTablist()).getByRole("tab", { name: "My draft" }))
    fireEvent.change(getTextarea(), {
      target: {
        value: [
          "Subject: Concern about Lucy",
          "",
          "Hello,",
          "",
          "My child came home upset and I would appreciate an explanation.",
          "",
          "Kind regards,",
          "Lucy's Dad",
        ].join("\n"),
      },
    })

    expect(screen.getByText("This looks like a parent message.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Switch to Parent message" }))

    expect(within(getInputTypeTablist()).getByRole("tab", { name: "Parent message" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  it("shows a gentle suggestion when parent message is selected but the text looks like a teacher draft", async () => {
    render(<MainEditor />)

    fireEvent.change(getTextarea(), {
      target: {
        value: [
          "Subject: Follow-up on Lucy",
          "",
          "Dear Parent/Carer,",
          "",
          "Thank you for your email. My intention was to keep the classroom expectation clear.",
          "",
          "Kind regards,",
          "Greg",
        ].join("\n"),
      },
    })

    expect(screen.getByText("This looks like your draft reply.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Switch to My draft" }))

    expect(within(getInputTypeTablist()).getByRole("tab", { name: "My draft" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  it("shows the backend safe message for handled non-200 draft failures", async () => {
    draftGenerateScenario = "json_error"

    render(<MainEditor />)

    fireEvent.change(getTextarea(), {
      target: {
        value:
          "Parent message: I want to send a calm update about homework expectations, explain the next step clearly, and keep the tone professional for the family.",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    expect(
      await screen.findByText(
        "Draft generation is temporarily unavailable. Please try again in a few seconds.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText("Something went wrong; please try again in a moment.")).toBeNull()
    expect(screen.queryByText("An unexpected error occurred.")).toBeNull()
  })

  it("falls back gracefully when the draft failure response is not JSON", async () => {
    draftGenerateScenario = "non_json_error"

    render(<MainEditor />)

    fireEvent.change(getTextarea(), {
      target: {
        value:
          "Parent message: I want to send a calm update about reading progress, explain tomorrow's check-in, and keep the tone measured and easy to defend.",
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    expect(
      await screen.findByText(
        "Draft generation is temporarily unavailable. Please try again in a few seconds.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText("Something went wrong; please try again in a moment.")).toBeNull()
    expect(screen.queryByText("An unexpected error occurred.")).toBeNull()
  })
})
