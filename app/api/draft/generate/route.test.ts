import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase/server", () => {
  const createMockCollection = () => {
    let counter = 0
    const buildDoc = (id?: string) => {
      const docId = id ?? `doc-${++counter}`
      return {
        id: docId,
        set: vi.fn().mockResolvedValue(undefined),
        collection: () => createMockCollection(),
      }
    }
    return {
      doc: (id?: string) => buildDoc(id),
    }
  }
  const createFirestoreStub = () => ({
    collection: () => createMockCollection(),
  })
  return {
    authorizeFirebaseRequest: vi.fn().mockResolvedValue({
      uid: "test-uid",
      firestore: createFirestoreStub(),
    }),
    FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {},
  }
})

vi.mock("@/lib/safety", () => ({
  detectSensitiveContent: vi.fn().mockImplementation((text) => ({ sanitized: text, matches: [] })),
  detectBlockedLanguage: vi.fn().mockReturnValue({ detected: false }),
  reframeBlockedLanguage: vi.fn().mockReturnValue({ applied: false }),
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
  buildUsageResponse: vi.fn().mockReturnValue({
    currentMonthUsage: 1,
    limit: 10,
    remaining: 9,
    plan: "free",
  }),
  incrementUsage: vi.fn().mockResolvedValue({ generationCount: 1 }),
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: vi.fn().mockResolvedValue({
    plan: "free",
    usage: { currentMonthUsage: 0, limit: 10, remaining: 10 },
    usageRecord: { generationCount: 0 },
    isProSubscriber: false,
  }),
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
    increment: (n: number) => n,
  },
}))

vi.mock("@/lib/draft-mode", () => ({
  resolveDraftMode: (mode: string | undefined) => mode ?? "parent_message",
}))

vi.mock("@/lib/draft/fallback", () => {
  const fallbackGenerator = vi.fn().mockResolvedValue({
    result: {
      text: "Liebe Eltern,\nWir kümmern uns.",
      providerMeta: {
        modelUsed: "test-model",
        latencyMs: 10,
      },
    },
    usedFallback: false,
    errorCode: null,
  })
  return {
    ALLOWED_TONES: ["warm", "professional", "direct", "empathetic"],
    generateDraftWithFallback: fallbackGenerator,
  }
})

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
  formatDraftText: () => ({ paragraphs: [] }),
}))

vi.mock("@/lib/draft/student-name", () => ({
  cleanStudentName: (value: string) => value.trim(),
}))

vi.mock("@/lib/draft/german-normalizer", () => ({
  normalizeGermanParentMessage: (value: string) => ({ text: value, neutralized: false }),
}))

vi.mock("@/lib/deescalation/detect", () => ({
  detectHighEmotionPhrases: () => ({}),
}))

vi.mock("@/lib/deescalation/rewrite", () => ({
  rewriteHighEmotionText: (text: string) => ({ cleanedText: text, summary: null }),
}))

vi.mock("@/lib/draft/language", () => ({
  canonicalizeLocaleIdentifier: (locale: string | undefined) => locale,
  resolveOutputLanguage: () => "de",
}))

vi.mock("@/lib/draft/signature", () => ({
  applySignatureToDraft: (text: string) => text,
  resolveSignature: () => ({ block: "" }),
}))

vi.mock("@/lib/draft/teacher-signature", () => ({
  resolveTeacherSignatureName: () => undefined,
}))

vi.mock("./scope-guard", () => ({
  isValidDraftRequest: () => true,
  OUT_OF_SCOPE_REDIRECT_MESSAGE: "out of scope",
}))

vi.mock("@/lib/debug", () => ({
  isDebugEnabled: () => false,
}))

vi.mock("@/lib/draft/greeting-resolution", async () => {
  const actual = await vi.importActual<typeof import("@/lib/draft/greeting-resolution")>(
    "@/lib/draft/greeting-resolution",
  )
  return {
    ...actual,
    logGreetingDecision: vi.fn(),
  }
})

import { POST } from "@/app/api/draft/generate/route"

describe("/api/draft/generate greeting handoff", () => {
  it("resolves greeting from raw situation and enforces the line", async () => {
    const payload = {
      situation: "Die Notiz ohne Gruß.",
      tone: "professional",
      language: "de",
      mode: "parent_message",
      situationRaw: "Schweigen.\nMit freundlichen Grüßen\nThomas Berger\n",
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
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.greeting?.confidence).toBe("HIGH")
    expect(json.data?.greeting?.final).toBe(true)
    expect(json.data?.generatedDraft.startsWith("Guten Tag, Thomas Berger,")).toBe(true)
  })

  it("enforces a resolved greeting when Elena Martínez appears in the raw text", async () => {
    const payload = {
      situation: "Die Beschwerde in eigenen Worten.",
      tone: "professional",
      language: "de",
      mode: "parent_message",
      situationRaw: "Beschwerde über das Verhalten.\nMit freundlichen Grüßen\nElena Martínez\n",
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
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.greeting?.final).toBe(true)
    expect(["MEDIUM", "HIGH"]).toContain(json.data?.greeting?.confidence)
    expect(json.data?.generatedDraft.startsWith("Guten Tag, Elena Martínez,")).toBe(true)
  })

  it("preserves titles such as Dr. Markus Schneider in the greeting", async () => {
    const payload = {
      situation: "Anfrage bezüglich des Stundenplans.",
      tone: "professional",
      language: "de",
      mode: "parent_message",
      situationRaw: "Kurze Nachricht zum Termin.\nMit freundlichen Grüßen\nDr. Markus Schneider\n",
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
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.greeting?.final).toBe(true)
    expect(json.data?.generatedDraft.startsWith("Guten Tag, Dr. Markus Schneider,")).toBe(true)
  })
})
