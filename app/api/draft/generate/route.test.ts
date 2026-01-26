import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { generateDraftWithFallback } from "@/lib/draft/fallback"
import { POST } from "@/app/api/draft/generate/route"

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
beforeAll(() => {
  process.env.NODE_ENV = "development"
})
afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

function createMockCollection() {
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

function createFirestoreStub() {
  return {
    collection: () => createMockCollection(),
  }
}

function getLongDraft() {
  return [
    "Liebe Eltern,",
    "Lukas hat beschrieben, dass die Hausaufgabenmenge und die zusätzlichen Übungsaufträge ihn zuletzt stark beansprucht haben, deshalb möchte ich diesen Punkt im ersten Absatz neutral zusammenfassen.",
    "Der Schüler zeigt weiterhin Fortschritte, aber wir benötigen einen klaren Plan für regelmäßige kurze Übungseinheiten zu Hause, damit er wieder Sicherheit gewinnt.",
    "Bitte schlagen Sie zwei Termine vor, an denen wir telefonisch oder per Teams die nächsten Schritte besprechen und offene Fragen klären können.",
    "Vielen Dank für Ihre Kooperation; gemeinsam unterstützen wir Lukas dabei, wieder Ruhe im Alltag zu finden.",
  ].join("\n\n")
}

const detailedSituation = [
  "Die Eltern schreiben, dass die Hausaufgabenlast und die zusätzlichen Übungsaufträge zuletzt deutlich zugenommen haben.",
  "Sie fragen, ob ihr Kind mit der Pensen Schritt halten kann, und bitten um konkrete Unterstützung.",
].join(" ")

const homeworkSituation = [
  "Die Eltern schreiben, dass die Menge an Hausaufgaben und Übungsaufträgen zuletzt zu groß geworden ist.",
  "Sie wünschen sich eine gemeinsame Lösung und konkrete nächste Schritte, damit Lukas wieder Ruhe im Alltag findet.",
].join(" ")

const buildFallbackResult = (text: string) => ({
  result: {
    text,
    providerMeta: {
      modelUsed: "test-model",
      latencyMs: 10,
    },
  },
  usedFallback: false,
  errorCode: null,
})

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn().mockResolvedValue({
    uid: "test-uid",
    firestore: createFirestoreStub(),
  }),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {},
}))

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdmin: vi.fn().mockReturnValue({
    auth: null,
    firestore: createFirestoreStub(),
    storage: null,
  }),
}))

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
  getCurrentMonthKey: () => "2025-01",
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

vi.mock("@/lib/draft/fallback", () => ({
  ALLOWED_TONES: ["warm", "professional", "direct", "empathetic"],
  generateDraftWithFallback: vi.fn(),
}))

const fallbackGenerator = vi.mocked(generateDraftWithFallback)

beforeEach(() => {
  fallbackGenerator.mockReset()
  fallbackGenerator.mockResolvedValue(buildFallbackResult(getLongDraft()))
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
  resolveOutputLanguage: ({
    explicit,
    preferred,
    uiLocale,
  }: {
    explicit?: string
    preferred?: string
    uiLocale?: string
    acceptLanguage?: string | null
  }) => {
    if (explicit) return explicit
    if (preferred) return preferred
    if (uiLocale) {
      return uiLocale.toLowerCase().startsWith("de") ? "de" : "en"
    }
    return "de"
  },
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

describe("/api/draft/generate greeting handoff", () => {
  it("resolves greeting from raw situation and enforces the line", async () => {
    const payload = {
      situation: detailedSituation,
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
      situation: `${detailedSituation} Die Beschwerde in eigenen Worten.`,
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

  it("re-resolves a trailing name when a generic greeting is provided", async () => {
    const payload = {
      situation: `${detailedSituation} Die Beschwerde in eigenen Worten.`,
      tone: "professional",
      language: "de",
      mode: "parent_message",
      greeting: {
        text: "Liebe Erziehungsberechtigte,",
        confidence: "NONE",
        source: "generic-fallback",
      },
      greetingFinal: true,
      situationRaw: "Beschwerde über das Verhalten.\nElena Martínez\n",
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
    expect(json.data?.greeting?.confidence).toBe("HIGH")
    const generatedDraft = json.data?.generatedDraft ?? ""
    const greetingLine = "Guten Tag, Elena Martínez,"
    expect(generatedDraft.startsWith(greetingLine)).toBe(true)
    const occurrenceCount = generatedDraft.split(greetingLine).length - 1
    expect(occurrenceCount).toBe(1)
    const wordCount = json.data?.metadata?.wordCount ?? 0
    expect(wordCount).toBeGreaterThanOrEqual(60)
  })

  it("allows the dev bypass header to authenticate a stable dev uid", async () => {
    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "de",
      mode: "parent_message",
    }
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zaza-dev-bypass": "1",
      },
      body: JSON.stringify(payload),
    })

    vi.mocked(authorizeFirebaseRequest).mockClear()
    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data?.metadata?.userId).toBe("dev-user")
    expect(response.headers.get("x-request-id")).toBeTruthy()
    expect(json.requestId).toBe(response.headers.get("x-request-id"))
    expect(authorizeFirebaseRequest).not.toHaveBeenCalled()
  })

  it("returns a structured validation error when payload fields are invalid", async () => {
    const payload = {
      situation: 123,
      tone: "professional",
      language: "de",
      mode: "parent_message",
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
    expect(response.status).toBe(422)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error).toEqual({
      code: "VALIDATION",
      message: "The situation field must be text.",
    })
    expect(typeof json.requestId).toBe("string")
    expect(response.headers.get("x-request-id")).toBe(json.requestId)
  })

  it("rejects notes that are only greetings after sanitization", async () => {
    const payload = {
      situation: "Guten Tag,\nMit freundlichen Grüßen",
      tone: "professional",
      language: "de",
      mode: "parent_message",
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
    expect(response.status).toBe(422)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe("INSUFFICIENT_INPUT")
    expect(json.data?.substantiveLines).toBe(0)
    expect(json.data?.wordCount).toBeGreaterThanOrEqual(0)
    expect(response.headers.get("x-request-id")).toBe(json.requestId)
  })

  it("anchors a homework complaint in the first paragraph without behaviour documentation language", async () => {
    const payload = {
      situation: homeworkSituation,
      tone: "professional",
      language: "de",
      mode: "parent_message",
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
    const generatedDraft = json.data?.generatedDraft ?? ""
    const paragraphs = generatedDraft
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
    const firstContentParagraph =
      paragraphs.find((para) => !/^Liebe|^Guten Tag|^Sehr geehrte/i.test(para)) ?? ""
    expect(firstContentParagraph.toLowerCase()).toContain("hausaufgaben")
    expect(firstContentParagraph.toLowerCase()).toContain("lukas")
    expect(generatedDraft).not.toContain("Verhalten dokumentieren")
    expect(generatedDraft).not.toMatch(/[Ã�]/)
    expect(response.headers.get("x-request-id")).toBe(json.requestId)
  })

  it("ignores Gmail chrome noise when resolving the parent's name", async () => {
    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "de",
      mode: "parent_message",
      situationRaw: "Sans Serif\nCompose\nMit freundlichen Grüßen\nLukas Breuer\n",
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
    const greetingText = json.data?.greeting?.text ?? ""
    expect(greetingText).toContain("Lukas Breuer")
    expect(greetingText).not.toContain("Sans Serif")
    expect(json.data?.generatedDraft.startsWith("Guten Tag, Lukas Breuer,")).toBe(true)
  })

  it("appends the closing line and fallback signature when the draft lacks them", async () => {
    const fallbackText = ["Liebe Eltern,", "Vielen Dank für Ihr Vertrauen; ich nehme Ihr Anliegen ernst."].join(
      "\n\n",
    )
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackText))
    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "de",
      mode: "parent_message",
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
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).toContain("Kind regards,")
    expect(generatedDraft.trim().endsWith("Ihre Klassenlehrkraft")).toBe(true)
  })

  it("anchors the English concern for Ella in the first paragraph", async () => {
    const englishOutput = [
      "Dear family,",
      "Ella feels singled out and embarrassed in class discussions, and I want to restate this concern before proposing next steps.",
      "I will prepare a calm plan for a brief call so we can align on how to support her.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValue(buildFallbackResult(englishOutput))
    const payload = {
      situation: englishOutput,
      tone: "professional",
      language: "en",
      mode: "parent_message",
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
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).toContain("Kind regards")
    expect(generatedDraft.trim().endsWith("Your child's teacher")).toBe(true)
    const paragraphs = generatedDraft
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
    const firstContentParagraph =
      paragraphs.find((para) => !/^Dear|^Hello|^Liebe|^Guten Tag/i.test(para)) ?? ""
    expect(firstContentParagraph).toContain("Ella")
    expect(firstContentParagraph).toContain("singled out")
  })

  it("preserves titles such as Dr. Markus Schneider in the greeting", async () => {
    const payload = {
      situation: `${detailedSituation} Die Anfrage bezüglich des Stundenplans wurde mehrfach angesprochen und soll kurzfristig geklärt werden.`,
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

  it("replaces a fallback greeting when Mit Nachdruck signature is present", async () => {
    const payload = {
      situation: `${detailedSituation} Problematisches Verhalten dokumentiert.`,
      tone: "professional",
      language: "de",
      mode: "parent_message",
      greeting: {
        text: "Liebe Eltern,",
        confidence: "NONE",
        source: "generic-fallback",
      },
      situationRaw: "Vorfall im Unterricht.\nMit Nachdruck\nFrank Weber\n",
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
    expect(json.data?.greeting?.text).toBe("Guten Tag, Frank Weber,")
    expect(json.data?.generatedDraft.startsWith("Guten Tag, Frank Weber,")).toBe(true)
    const generatedDraft = json.data?.generatedDraft ?? ""
    const greetingLine = "Guten Tag, Frank Weber,"
    const occurrenceCount = generatedDraft.split(greetingLine).length - 1
    expect(occurrenceCount).toBe(1)
    const wordCount = json.data?.metadata?.wordCount ?? 0
    expect(wordCount).toBeGreaterThanOrEqual(60)
  })
})
