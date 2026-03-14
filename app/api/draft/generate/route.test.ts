import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { generateDraftWithFallback } from "@/lib/draft/fallback"
import { POST } from "@/app/api/draft/generate/route"
import { buildUsageResponse, getCurrentMonthKey, incrementUsage } from "@/lib/usage"
import { getUserEntitlements } from "@/lib/entitlements"
import { isInternalQaUid, shouldRespectUsageLimit } from "@/lib/auth/internal-qa"
import { resolveDraftEntitlement } from "@/lib/draft-entitlements"

interface TrustGradeViolation {
  type: string
  phrase: string
  locale: string
}

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

const englishGreetingSituation = [
  "I wanted to reach out because the extra homework and math practice this week have been overwhelming for my child.",
  "It would help to understand what supports we can provide before the weekend and to coordinate our calls.",
].join(" ")

const englishDeescalationSituation =
  "The parent says their child lies in class, refuses to share notes, and blames others for every mistake, so we want to keep the response calm before the next family conversation."

const germanDeescalationSituation =
  "Die Eltern schreiben, dass ihr Kind lügen verbreitet, dumm wirkt und andere verantwortlich macht, also sollten wir sachlich bleiben und klare nächste Schritte anbieten."

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

const TRUST_GRADE_FAILURE_MESSAGE =
  "Unable to generate a compliant draft. Please rephrase or contact support."

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
  getCurrentMonthKey: vi.fn().mockReturnValue("2025-01"),
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: vi.fn().mockResolvedValue({
    plan: "free",
    usage: {
      currentMonthUsage: 0,
      limit: 10,
      remaining: 10,
    },
    usageRecord: { month: "2025-01", generationCount: 0, lastReset: new Date().toISOString() },
    isProSubscriber: false,
  }),
}))

vi.mock("@/lib/draft-entitlements", () => ({
  hasDraftEntitlementAccess: (entitlement: { hasAccess: boolean; status: string }) =>
    entitlement.hasAccess && (entitlement.status === "active" || entitlement.status === "trial"),
  resolveDraftEntitlement: vi.fn().mockImplementation(async ({ uid, localEntitlements }) => ({
    entitlement: {
      userId: uid,
      productKey: "draft",
      hasAccess: true,
      accessType: "paid",
      expiresAt: null,
      source: "direct",
      sourceOrgId: null,
      orgId: null,
      licenceId: "lic_1",
      status: "active",
    },
    source: "local_disabled",
    localEntitlements: localEntitlements ?? {
      plan: "free",
      usage: {
        plan: "free",
        currentMonthUsage: 0,
        limit: 10,
        remaining: 10,
        unlimited: false,
      },
      usageRecord: { month: "2025-01", generationCount: 0, lastReset: new Date().toISOString() },
      isProSubscriber: false,
    },
  })),
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
const mockedBuildUsageResponse = vi.mocked(buildUsageResponse)
const mockedIncrementUsage = vi.mocked(incrementUsage)
const mockedGetCurrentMonthKey = vi.mocked(getCurrentMonthKey)
const mockedGetUserEntitlements = vi.mocked(getUserEntitlements)
const mockedShouldRespectUsageLimit = vi.mocked(shouldRespectUsageLimit)
const mockedIsInternalQaUid = vi.mocked(isInternalQaUid)
const mockedAuthorizeFirebaseRequest = vi.mocked(authorizeFirebaseRequest)
const mockedResolveDraftEntitlement = vi.mocked(resolveDraftEntitlement)
beforeEach(() => {
  vi.clearAllMocks()
  fallbackGenerator.mockReset()
  fallbackGenerator.mockResolvedValue(buildFallbackResult(getLongDraft()))
  mockedBuildUsageResponse.mockReturnValue({
    currentMonthUsage: 1,
    limit: 10,
    remaining: 9,
    plan: "free",
    unlimited: false,
  })
  mockedIncrementUsage.mockResolvedValue({
    month: "2025-01",
    generationCount: 1,
    lastReset: new Date().toISOString(),
  })
  mockedGetCurrentMonthKey.mockReturnValue("2025-01")
  mockedGetUserEntitlements.mockResolvedValue({
    plan: "free",
    usage: {
      plan: "free",
      currentMonthUsage: 0,
      limit: 10,
      remaining: 10,
      unlimited: false,
    },
    usageRecord: {
      month: "2025-01",
      generationCount: 0,
      lastReset: new Date().toISOString(),
    },
    isProSubscriber: false,
  })
  mockedShouldRespectUsageLimit.mockReturnValue(true)
  mockedIsInternalQaUid.mockReturnValue(false)
  mockedAuthorizeFirebaseRequest.mockResolvedValue({
    uid: "test-uid",
    firestore: createFirestoreStub(),
  })
  mockedResolveDraftEntitlement.mockResolvedValue({
    entitlement: {
      userId: "test-uid",
      productKey: "draft",
      hasAccess: true,
      accessType: "paid",
      expiresAt: null,
      source: "direct",
      sourceOrgId: null,
      orgId: null,
      licenceId: "lic_1",
      status: "active",
    },
    source: "remote",
    localEntitlements: {
      plan: "free",
      usage: {
        plan: "free",
        currentMonthUsage: 0,
        limit: 10,
        remaining: 10,
        unlimited: false,
      },
      usageRecord: {
        month: "2025-01",
        generationCount: 0,
        lastReset: new Date().toISOString(),
      },
      isProSubscriber: false,
    },
  })
})

vi.mock("@/lib/auth/internal-qa", () => ({
  isInternalQaUid: vi.fn().mockReturnValue(false),
  shouldRespectUsageLimit: vi.fn().mockReturnValue(true),
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
    expect(generatedDraft).toContain("Mit freundlichen Grüßen,")
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

  it("resolves an English parent greeting when raw text ends with a signed name", async () => {
    const fallbackDraft = [
      "Thank you for sharing the context for this concern.",
      "I will gather notes, summarize the key observations, and make a calm plan for a quick sync-up.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackDraft))
    const payload = {
      situation: englishGreetingSituation,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      situationRaw: "Sharing a follow-up.\nSincerely\nJordan Lee\n",
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
    const greetingLine = json.data?.greeting?.text ?? "Dear Jordan Lee,"
    expect(generatedDraft.startsWith(greetingLine)).toBe(true)
  })
})

describe("/api/draft/generate child name anchoring", () => {
  const cases = [
    { language: "en", uiLocale: "en-GB", studentFirstName: "Noah" },
    { language: "de", uiLocale: "de-DE", studentFirstName: "Lukas" },
  ]

  cases.forEach((testCase) => {
    it(`passes the ${testCase.language} student name into the fallback context`, async () => {
      const payload = {
        situation: detailedSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
        mode: "parent_message",
        studentFirstName: ` ${testCase.studentFirstName} `,
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
      const contextUsed = fallbackGenerator.mock.calls[fallbackGenerator.mock.calls.length - 1]?.[1]
      expect(contextUsed?.studentFirstName).toBe(testCase.studentFirstName)
    })
  })
})

describe("/api/draft/generate routing classification", () => {
  it("classifies typed safe draft notes as teacher internal notes", async () => {
    const payload = {
      situation:
        "Need to send a calm update to Noah's family about homework, reassure them, and outline the next steps I will take in class tomorrow.",
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
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
    const providerInput = fallbackGenerator.mock.calls[fallbackGenerator.mock.calls.length - 1]?.[0]
    expect(providerInput?.generationMetadata).toMatchObject({
      mode: "safe_draft",
      direction: "teacher_internal_notes",
      source_type: "typed_text",
      prompt_builder: "safe_draft",
    })
  })

  it("keeps panic scan routing on the panic scan prompt path", async () => {
    const payload = {
      situation: detailedSituation,
      situationRaw: "My child came home upset and I need to understand what happened in class today.",
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      inputMode: "panic_scan",
      sourceType: "ocr_text",
      messageType: "parent_complaint",
      scanId: "scan-123",
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
    const providerInput = fallbackGenerator.mock.calls[fallbackGenerator.mock.calls.length - 1]?.[0]
    expect(providerInput?.generationMetadata).toMatchObject({
      mode: "panic_scan",
      direction: "parent_to_teacher",
      source_type: "ocr_text",
      prompt_builder: "panic_scan",
    })
  })

  it("keeps voice-to-calm routing on the transcript prompt path", async () => {
    const payload = {
      situation:
        "I am frustrated and need to turn these spoken notes into a calm update for the parent about the missed homework and tomorrow's support plan.",
      tone: "empathetic",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      inputMode: "voice_to_calm",
      sourceType: "voice_transcript",
      voiceSessionId: "voice-123",
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
    const providerInput = fallbackGenerator.mock.calls[fallbackGenerator.mock.calls.length - 1]?.[0]
    expect(providerInput?.generationMetadata).toMatchObject({
      mode: "voice_to_calm",
      direction: "teacher_internal_notes",
      source_type: "voice_transcript",
      prompt_builder: "voice_to_calm",
    })
  })
})

describe("/api/draft/generate de-escalation parity", () => {
  const cases = [
    { language: "en", uiLocale: "en-GB", triggerSnippet: "lies" },
    { language: "de", uiLocale: "de-DE", triggerSnippet: "dumm" },
  ]

  cases.forEach((testCase) => {
    it(`returns a de-escalation summary when ${testCase.language} input is rephrased`, async () => {
      fallbackGenerator.mockResolvedValueOnce(buildFallbackResult("I will follow up with calm next steps."))
      const payload = {
        situation:
          testCase.language === "en" ? englishDeescalationSituation : germanDeescalationSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
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
      expect(json.data?.deescalationSummary?.wasDeescalated).toBe(true)
      expect(json.data?.deescalationSummary?.coachingLine).toContain("softened")
      const flaggedPhrases = json.data?.deescalationSummary?.flaggedPhrases ?? []
      expect(flaggedPhrases.length).toBeGreaterThan(0)
    })
  })
})

describe("/api/draft/generate trust-grade guard", () => {
  const trustGradeCases = [
    {
      description: "rejects drafts with banned EN trust-grade language",
      uiLocale: "en-GB",
      language: "en",
      expectedLocale: "en",
      violationDraft: [
        "Dear family,",
        "This behaviour is unacceptable and I guarantee to keep your concerns at the centre of our work.",
        "I will never forget how earnest this feels, and you should know we reviewed every detail.",
        "I spoke with the team and teachers must continue to have this conversation.",
      ].join("\n\n"),
      expectedTypes: ["MORAL_JUDGEMENT", "ABSOLUTE_PROMISE", "FABRICATED_PAST_ACTION", "META_INSTRUCTION"],
      expectedPhrases: ["unacceptable", "guarantee", "never", "i spoke with", "we reviewed", "you should", "teachers must"],
    },
    {
      description: "rejects drafts with banned DE trust-grade language",
      uiLocale: "de-DE",
      language: "de",
      expectedLocale: "de",
      violationDraft: [
        "Liebe Familie,",
        "Dieses Verhalten ist inakzeptabel und das wird garantiert niemals wieder vorkommen.",
        "Sie sollten wissen, dass ich habe mit dem Team gesprochen, wir haben gesprochen und wir haben geprüft alle relevanten Unterlagen.",
        "Lehrer müssen weiterhin zusammenarbeiten.",
      ].join("\n\n"),
      expectedTypes: ["MORAL_JUDGEMENT", "ABSOLUTE_PROMISE", "FABRICATED_PAST_ACTION", "META_INSTRUCTION"],
      expectedPhrases: [
        "inakzeptabel",
        "niemals",
        "garantiert",
        "ich habe mit",
        "wir haben gesprochen",
        "wir haben geprüft",
        "sie sollten",
        "lehrer müssen",
      ],
    },
  ]

  trustGradeCases.forEach((testCase) => {
    it(testCase.description, async () => {
      fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(testCase.violationDraft))
      fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(testCase.violationDraft))
      const payload = {
        situation: detailedSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
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
      expect(json.error?.code).toBe("TRUST_GRADE_VIOLATION")
      expect(json.error?.message).toBe(TRUST_GRADE_FAILURE_MESSAGE)
      const violations = json.data?.violations ?? []
      testCase.expectedTypes.forEach((type) => {
        expect(violations.some((violation: TrustGradeViolation) => violation.type === type)).toBe(true)
      })
      testCase.expectedPhrases.forEach((phrase) => {
        expect(violations.some((violation: TrustGradeViolation) => violation.phrase === phrase)).toBe(true)
      })
      expect(violations.every((violation: TrustGradeViolation) => violation.locale === testCase.expectedLocale)).toBe(true)
    })
  })
})

describe("/api/draft/generate trust-grade regeneration", () => {
  it("regenerates when meta-instructions appear", async () => {
    const metaViolationDraft = [
      "Dear family,",
      "Teachers must stay on top of every concern, so keep sharing every thought.",
      "The following text should be calm.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(metaViolationDraft))
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(getLongDraft()))
    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
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
    const regenInput = fallbackGenerator.mock.calls[1]?.[0]
    expect(regenInput?.trustGradeViolations?.types).toContain("META_INSTRUCTION")
    expect(regenInput?.trustGradeViolations?.phrases).toContain("teachers must")
  })

  it("regenerates when moral-judgement language appears", async () => {
    const moralViolationDraft = [
      "Liebe Familie,",
      "Dieses Verhalten ist inakzeptabel.",
      "Wir bleiben sachlich.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(moralViolationDraft))
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(getLongDraft()))
    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "de",
      uiLocale: "de-DE",
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
    const regenInput = fallbackGenerator.mock.calls[1]?.[0]
    expect(regenInput?.trustGradeViolations?.types).toContain("MORAL_JUDGEMENT")
    expect(regenInput?.trustGradeViolations?.phrases).toContain("inakzeptabel")
  })

  it("fails when regeneration cannot resolve violations", async () => {
    const failingDraft = [
      "Dear family,",
      "This behaviour is unacceptable and teachers must know.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(failingDraft))
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(failingDraft))
    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
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
    expect(json.error?.message).toBe(TRUST_GRADE_FAILURE_MESSAGE)
    expect(fallbackGenerator.mock.calls.length).toBe(2)
  })
})

describe("/api/draft/generate usage entitlement parity", () => {
  it("returns 403 when draft entitlement denies access", async () => {
    mockedResolveDraftEntitlement.mockResolvedValueOnce({
      entitlement: {
        userId: "test-uid",
        productKey: "draft",
        hasAccess: false,
        accessType: "none",
        expiresAt: null,
        source: "none",
        sourceOrgId: null,
        orgId: null,
        licenceId: null,
        status: "none",
      },
      source: "remote_terminal",
      localEntitlements: {
        plan: "free",
        usage: {
          plan: "free",
          currentMonthUsage: 0,
          limit: 10,
          remaining: 10,
          unlimited: false,
        },
        usageRecord: {
          month: "2025-01",
          generationCount: 0,
          lastReset: new Date().toISOString(),
        },
        isProSubscriber: false,
      },
    })

    const payload = {
      situation: detailedSituation,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
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
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error?.code).toBe("NOT_ENTITLED")
  })

  const limitCases = [
    {
      language: "en",
      uiLocale: "en-GB",
      expectedMessage: "You have reached your monthly draft limit. Upgrade to unlock Draft Pro for unlimited generations.",
    },
    {
      language: "de",
      uiLocale: "de-DE",
      expectedMessage: "Dein Gratis-Limit ist erreicht. Upgrade auf Draft Pro für unbegrenzte Entwürfe.",
    },
  ]

  limitCases.forEach((testCase) => {
    it(`returns a localized usage limit error for ${testCase.language}`, async () => {
      mockedGetUserEntitlements.mockResolvedValueOnce({
        plan: "free",
        usage: {
          plan: "free",
          currentMonthUsage: 11,
          limit: 10,
          remaining: 0,
          unlimited: false,
        },
        usageRecord: {
          month: "2025-01",
          generationCount: 11,
          lastReset: new Date().toISOString(),
        },
        isProSubscriber: false,
      })

      const payload = {
        situation: detailedSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
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
      expect(response.status).toBe(429)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error?.code).toBe("USAGE_LIMIT_EXCEEDED")
      expect(json.error?.message).toBe(testCase.expectedMessage)
      expect(json.data?.usage?.remaining).toBe(0)
      expect(json.data?.usage?.plan).toBe("free")
      expect(mockedIncrementUsage).not.toHaveBeenCalled()
    })
  })

  const qaLocales = [
    { language: "en", uiLocale: "en-GB" },
    { language: "de", uiLocale: "de-DE" },
  ]

  qaLocales.forEach((testCase) => {
    it(`allows QA UIDs to bypass usage limits for ${testCase.language}`, async () => {
      mockedIsInternalQaUid.mockReturnValueOnce(true)
      mockedShouldRespectUsageLimit.mockReturnValueOnce(false)
      mockedGetUserEntitlements.mockResolvedValueOnce({
        plan: "free",
        usage: {
          plan: "free",
          currentMonthUsage: 12,
          limit: 10,
          remaining: 0,
          unlimited: false,
        },
        usageRecord: {
          month: "2025-01",
          generationCount: 12,
          lastReset: new Date().toISOString(),
        },
        isProSubscriber: false,
      })

      const payload = {
        situation: detailedSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
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
      expect(json.success).toBe(true)
      expect(json.data?.metadata?.language).toBe(testCase.language)
      expect(mockedIncrementUsage).not.toHaveBeenCalled()
    })
  })

  const devLocales = [
    { language: "en", uiLocale: "en-GB" },
    { language: "de", uiLocale: "de-DE" },
  ]

  devLocales.forEach((testCase) => {
    it(`allows dev bypass header for ${testCase.language}`, async () => {
      const payload = {
        situation: detailedSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
        mode: "parent_message",
      }
      const request = new Request("https://example.com/api/draft/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zaza-dev-bypass": "1",
          Authorization: "Bearer token",
        },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data?.metadata?.userId).toBe("dev-user")
      expect(mockedAuthorizeFirebaseRequest).not.toHaveBeenCalled()
      expect(mockedIncrementUsage).not.toHaveBeenCalled()
    })
  })

  const rolloverLocales = [
    { language: "en", uiLocale: "en-GB" },
    { language: "de", uiLocale: "de-DE" },
  ]

  rolloverLocales.forEach((testCase) => {
    it(`resets usage after month rollover for ${testCase.language}`, async () => {
      mockedGetCurrentMonthKey.mockReturnValueOnce("2025-02")
      mockedGetUserEntitlements.mockResolvedValueOnce({
        plan: "free",
        usage: {
          plan: "free",
          currentMonthUsage: 0,
          limit: 10,
          remaining: 10,
          unlimited: false,
        },
        usageRecord: {
          month: "2025-01",
          generationCount: 10,
          lastReset: new Date().toISOString(),
        },
        isProSubscriber: false,
      })

      const payload = {
        situation: detailedSituation,
        tone: "professional",
        language: testCase.language,
        uiLocale: testCase.uiLocale,
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
      expect(json.success).toBe(true)
      expect(json.data?.usage?.plan).toBe("free")
      expect(json.data?.usage?.remaining).toBe(9)
      expect(mockedIncrementUsage).toHaveBeenCalled()
    })
  })
})
