feature/draftcontext-orchestration
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

vi.mock("@/lib/draft/format", () => ({
  formatDraftText: () => ({
    sections: [],
  }),
}))

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: "My student needs help",
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
})

import { describe, expect, it, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/draft/generate/route"

const snippetDocSet = vi.fn().mockResolvedValue(undefined)
const diagnosticsSet = vi.fn().mockResolvedValue(undefined)
const insightsSet = vi.fn().mockResolvedValue(undefined)
const userDocSet = vi.fn().mockResolvedValue(undefined)

const snippetDoc = {
  id: "snippet-id",
  set: snippetDocSet,
  collection: () => ({ doc: () => snippetDoc }),
}

const userDoc = {
  id: "user-id",
  set: userDocSet,
  collection: (name: string) => {
    if (name === "snippets") {
      return { doc: () => snippetDoc }
    }
    if (name === "diagnostics") {
      return { doc: () => ({ id: "status", set: diagnosticsSet }) }
    }
    if (name === "insights") {
      return { doc: () => ({ id: "summary", set: insightsSet }) }
    }
    return { doc: () => snippetDoc }
  },
}

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn().mockResolvedValue({
    uid: "test-user",
    firestore: {
      collection: () => ({
        doc: () => userDoc,
      }),
    },
  }),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {},
}))

vi.mock("@/lib/safety", () => ({
  detectSensitiveContent: (text: string) => ({ sanitized: text, matches: [] }),
  detectBlockedLanguage: () => ({ detected: false }),
  reframeBlockedLanguage: () => ({ applied: false }),
  BlockedLanguageTier: {
    tier1: "tier1",
    tier2: "tier2",
    tier3: "tier3",
  },
}))

vi.mock("@/lib/analytics", () => ({
  logServerEvent: vi.fn(),
}))

vi.mock("@/lib/usage", () => ({
  buildUsageResponse: () => ({
    currentMonthUsage: 1,
    limit: 10,
    remaining: 9,
    plan: "free",
  }),
  incrementUsage: vi.fn().mockResolvedValue({ generationCount: 1 }),
  getCurrentMonthKey: () => "2026-01",
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: () =>
    Promise.resolve({
      plan: "free",
      usage: { currentMonthUsage: 0, limit: 10, remaining: 10 },
      usageRecord: { generationCount: 0 },
      isProSubscriber: false,
    }),
}))

vi.mock("@/lib/ai/provider", () => ({
  generateDraft: vi.fn(),
  ProviderMeta: class {},
  ProviderResult: class {},
}))

vi.mock("@/lib/text/pronouns", () => ({
  enforcePronouns: (text: string) => text,
  inferPronounResolution: () => ({
    resolvedPreference: "auto",
    reason: null,
    source: null,
  }),
}))

vi.mock("@/lib/rate-limit", () => ({
  enforceDraftRateLimit: vi.fn().mockResolvedValue(undefined),
  RateLimitError: class RateLimitError extends Error {},
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "timestamp",
    increment: (value: number) => value,
  },
}))

vi.mock("@/lib/draft-mode", () => ({
  resolveDraftMode: (mode?: string) => (mode ? mode : "parent_message"),
}))

vi.mock("@/lib/draft/fallback", () => ({
  ALLOWED_TONES: ["warm", "professional", "direct", "empathetic"],
  generateDraftWithFallback: vi.fn().mockResolvedValue({
    result: {
      text: "Dear family,\n\nThank you for reaching out.",
      providerMeta: { modelUsed: "test", latencyMs: 1 },
    },
    usedFallback: false,
    errorCode: null,
  }),
}))

vi.mock("@/lib/auth/internal-qa", () => ({
  isInternalQaUid: () => false,
  shouldRespectUsageLimit: () => true,
}))

vi.mock("@/lib/draft/blocked-response", () => ({
  buildBlockedLanguageResponse: () => ({ message: "blocked" }),
}))

vi.mock("@/lib/draft/teacher-language", () => ({
  enforceTeacherNameStyle: (text: string) => text,
}))

vi.mock("@/lib/draft/format", () => ({
  formatDraftText: () => ({ paragraphs: [""] }),
}))

vi.mock("@/lib/draft/student-name", () => ({
  cleanStudentName: (value: string) => value.trim(),
}))

vi.mock("@/lib/draft/german-normalizer", () => ({
  normalizeGermanParentMessage: () => ({ text: "", neutralized: false }),
}))

vi.mock("@/lib/deescalation/detect", () => ({
  detectHighEmotionPhrases: () => ({}),
}))

vi.mock("@/lib/deescalation/rewrite", () => ({
  rewriteHighEmotionText: (text: string) => ({ cleanedText: text, summary: null }),
}))

vi.mock("@/lib/draft/language", () => ({
  canonicalizeLocaleIdentifier: (locale?: string) => locale,
  resolveOutputLanguage: ({ explicit, preferred }: { explicit?: string; preferred?: string }) =>
    explicit ?? preferred ?? "de",
}))

vi.mock("@/lib/draft/signature", () => ({
  applySignatureToDraft: (text: string) => text,
  resolveSignature: () => ({
    block: "",
    placeholders: {},
    appendForMode: { parent_message: true, report_comment: false },
  }),
}))

vi.mock("./scope-guard", () => ({
  isValidDraftRequest: () => true,
  OUT_OF_SCOPE_REDIRECT_MESSAGE: "out of scope",
}))

vi.mock("@/lib/debug", () => ({
  isDebugEnabled: () => false,
}))

describe("snippet persistence guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends back a success response and writes a snippet even when context subject is absent", async () => {
    const payload = {
      situation:
        "Liebe Lehrerin, ich bin besorgt, dass meine Tochter mit den Hausaufgaben nicht mehr nachkommt. Die Menge scheint sehr umfangreich zu sein und belastet unsere Woche.",
      tone: "professional",
      language: "de",
      mode: "parent_message",
      context: {
        gradeLevel: "Year 4",
      },
    }
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(snippetDocSet).toHaveBeenCalled()
    const snippetPayload = snippetDocSet.mock.calls[0][0]
    expect(snippetPayload.contextUsed?.subject).toBeUndefined()
  })
})
main
