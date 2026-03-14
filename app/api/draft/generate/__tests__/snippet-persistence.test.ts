import { describe, expect, it, vi, beforeEach } from "vitest"

const snippetSet = vi.fn().mockResolvedValue(undefined)
const diagnosticsSet = vi.fn().mockResolvedValue(undefined)
const insightsSet = vi.fn().mockResolvedValue(undefined)
const userSet = vi.fn().mockResolvedValue(undefined)

const snippetDoc = {
  id: "snippet-id",
  set: snippetSet,
}
const diagnosticsDoc = {
  id: "status",
  set: diagnosticsSet,
}
const insightsDoc = {
  id: "summary",
  set: insightsSet,
}

const userDoc = {
  id: "test-user",
  set: userSet,
  collection: (name: string) => {
    if (name === "snippets") {
      return { doc: () => snippetDoc }
    }
    if (name === "diagnostics") {
      return { doc: () => diagnosticsDoc }
    }
    if (name === "insights") {
      return { doc: () => insightsDoc }
    }
    return {
      doc: () => ({
        id: `${name}-doc`,
        set: vi.fn().mockResolvedValue(undefined),
      }),
    }
  },
}

const firestore = {
  collection: (name: string) => {
    if (name === "users") {
      return {
        doc: (_uid: string) => userDoc,
      }
    }
    return {
      doc: () => ({
        id: `${name}-doc`,
        set: vi.fn().mockResolvedValue(undefined),
      }),
    }
  },
}

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(async () => ({
    uid: "test-user",
    firestore,
  })),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

vi.mock("@/lib/safety", () => ({
  detectSensitiveContent: () => ({ sanitized: "text", matches: [] }),
  detectBlockedLanguage: () => ({ detected: false, tier: null }),
  reframeBlockedLanguage: () => ({ applied: false, text: "", summary: "" }),
  BlockedLanguageTier: {
    tier3: "tier3",
  },
}))

vi.mock("@/lib/analytics", () => ({
  logServerEvent: vi.fn(),
}))

const usageOverview = {
  plan: "free",
  currentMonthUsage: 1,
  limit: 10,
  remaining: 9,
  unlimited: false,
}
vi.mock("@/lib/usage", () => ({
  buildUsageResponse: () => usageOverview,
  getCurrentMonthKey: () => "2026-01",
  incrementUsage: vi.fn(async () => ({
    month: "2025-01",
    generationCount: 1,
    lastReset: "now",
  })),
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: vi.fn(async () => ({
    plan: "free",
    usageRecord: {
      month: "2025-01",
      generationCount: 0,
      lastReset: "now",
    },
    usage: {
      plan: "free",
      currentMonthUsage: 0,
      limit: 10,
      remaining: 10,
      unlimited: false,
    },
    isProSubscriber: false,
  })),
}))

vi.mock("@/lib/text/pronouns", () => ({
  enforcePronouns: (text: string) => text,
  inferPronounResolution: () => ({
    resolvedPreference: "auto",
    reason: "none",
    source: null,
  }),
}))

vi.mock("@/lib/rate-limit", () => ({
  enforceDraftRateLimit: vi.fn(async () => undefined),
  RateLimitError: class RateLimitError extends Error {},
}))

vi.mock("@/lib/draft-mode", () => ({
  resolveDraftMode: () => "parent_message",
}))

vi.mock("@/lib/draft/fallback", () => ({
  ALLOWED_TONES: ["warm", "professional", "direct", "empathetic"],
  buildFallbackDraft: () =>
    [
      "Subject: Classroom update",
      "Dear parent(s),",
      "I wanted to give you a clear update about your child and explain the adjustment I will make in class.",
      "If a short conversation would help, I can speak with you this week.",
      "Kind regards,",
    ].join("\n"),
  generateDraftWithFallback: vi.fn(async () => ({
    result: {
      text: "Hello",
      providerMeta: { modelUsed: "test-model", latencyMs: 1, tokensUsed: 5 },
    },
    usedFallback: false,
    errorCode: null,
  })),
}))

vi.mock("@/lib/auth/internal-qa", () => ({
  isInternalQaUid: () => false,
  shouldRespectUsageLimit: () => false,
}))

vi.mock("@/lib/draft/blocked-response", () => ({
  buildBlockedLanguageResponse: () => ({ message: "blocked" }),
}))

vi.mock("@/lib/draft/teacher-language", () => ({
  enforceTeacherNameStyle: (text: string) => text,
}))

vi.mock("@/lib/draft/format", async () => {
  const actual = await vi.importActual<typeof import("@/lib/draft/format")>(
    "@/lib/draft/format",
  )
  return {
    ...actual,
    formatDraftText: (text: string) => {
      const normalized = text.replace(/\r\n/g, "\n").trim()
      if (!normalized) {
        return { paragraphs: [] }
      }
      const paragraphs = normalized
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
      return { paragraphs }
    },
  }
})

vi.mock("@/lib/draft/student-name", () => ({
  cleanStudentName: (value: string) => value,
}))

vi.mock("@/lib/draft/german-normalizer", () => ({
  normalizeGermanParentMessage: (text: string) => ({
    text,
    neutralized: false,
  }),
}))

vi.mock("@/lib/deescalation/detect", () => ({
  detectHighEmotionPhrases: () => ({ flaggedPhrases: [] }),
}))

vi.mock("@/lib/deescalation/rewrite", () => ({
  rewriteHighEmotionText: (text: string) => ({
    cleanedText: text,
    summary: {
      wasDeescalated: false,
      flaggedPhrases: [],
      coachingLine: "",
    },
  }),
}))

vi.mock("@/lib/draft/language", () => ({
  resolveOutputLanguage: () => "en",
  canonicalizeLocaleIdentifier: () => "en-GB",
}))

const sampleSituation =
  "Ich melde mich wegen einer Rückfrage zum Unterricht. Ein Elternteil berichtet, dass das Kind seit mehreren Tagen besorgt nach Hause kommt und sich über die Hausaufgabenmenge beklagt. Bitte helfen Sie mir, ruhig und professionell zu antworten, um die nächsten Schritte zu klären."

vi.mock("@/lib/draft/signature", () => ({
  resolveSignature: () => ({
    lines: ["Miss Teacher"],
    block: "Kind regards,\nMiss Teacher",
    placeholders: {},
    appendForMode: {
      parent_message: true,
      report_comment: false,
    },
  }),
  applySignatureToDraft: (text: string) => text,
}))

vi.mock("@/app/api/draft/generate/scope-guard", () => ({
  isValidDraftRequest: () => true,
  OUT_OF_SCOPE_REDIRECT_MESSAGE: "out of scope",
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "timestamp",
    increment: (value: number) => value,
  },
}))

describe("snippet persistence", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("persists snippets even when subject is missing", async () => {
    const { POST } = await import("@/app/api/draft/generate/route")
    const request = new Request("http://localhost/api/draft/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
      body: JSON.stringify({
        situation: sampleSituation,
        tone: "professional",
        uiLocale: "en-GB",
      }),
    })

    const response = await POST(request)
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(snippetSet).toHaveBeenCalledOnce()
    const contextUsed = snippetSet.mock.calls[0][0].contextUsed
    expect(contextUsed).toHaveProperty("requestId")
    expect(contextUsed).not.toHaveProperty("subject")
  })

  it("records a stable snippet payload with usage metadata", async () => {
    const { POST } = await import("@/app/api/draft/generate/route")
    const request = new Request("http://localhost/api/draft/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
      body: JSON.stringify({
        situation: sampleSituation,
        tone: "professional",
        uiLocale: "en-GB",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(snippetSet).toHaveBeenCalledOnce()
    const snippetPayload = snippetSet.mock.calls[0][0]
    expect(snippetPayload).toMatchObject({
      tone: "professional",
      language: "en",
      usage: usageOverview,
      mode: "parent_message",
      signatureBlock: "Kind regards,\nMiss Teacher",
    })
    expect(snippetPayload.generatedText).toContain("Hello")
    expect(snippetPayload.generatedText).toContain("Kind regards")
    expect(snippetPayload.requestId).toBe("snippet-id")
    expect(typeof snippetPayload.createdAt).toBe("string")
    expect(new Date(snippetPayload.createdAt).toString()).not.toBe("Invalid Date")
  })
})









