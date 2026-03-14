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

vi.mock("@/lib/text/pronouns", async () => {
  const actual = await vi.importActual<typeof import("@/lib/text/pronouns")>(
    "@/lib/text/pronouns",
  )
  return actual
})

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
  buildFallbackDraft: () =>
    [
      "Subject: Classroom update",
      "Dear parent(s),",
      "I wanted to give you a clear update about your child and explain the adjustment I will make in class.",
      "If a short conversation would help, I can speak with you this week.",
      "Kind regards,",
    ].join("\n"),
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
      const subjectMatch = paragraphs[0]?.match(/^(?:Subject|Betreff)\s*[:\-–—|]+\s*(.+)$/i)
      const subject = subjectMatch?.[1]?.trim()
      if (subject) {
        paragraphs.shift()
      }
      return { subject, paragraphs }
    },
  }
})

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
  resolveSignature: (payload?: { line1?: string; line2?: string; line3?: string }) => {
    const lines = [payload?.line1, payload?.line2, payload?.line3].filter(Boolean) as string[]
    return {
      lines,
      block: lines.join("\n"),
      placeholders: {},
      appendForMode: {
        parent_message: true,
        report_comment: false,
      },
    }
  },
}))

vi.mock("@/lib/draft/teacher-signature", () => ({
  resolveTeacherSignatureName: (_displayName?: string, signatureLine1?: string) =>
    signatureLine1?.trim() || undefined,
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
    expect(json.data?.generatedDraft.startsWith("Betreff:")).toBe(true)
    expect(json.data?.generatedDraft).toContain("\n\nGuten Tag, Thomas Berger,")
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
    expect(json.data?.generatedDraft.startsWith("Betreff:")).toBe(true)
    expect(json.data?.generatedDraft).toContain("\n\nGuten Tag, Elena Martínez,")
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
    expect(generatedDraft.startsWith("Betreff:")).toBe(true)
    expect(generatedDraft).toContain(`\n\n${greetingLine}`)
    const occurrenceCount = generatedDraft.split(greetingLine).length - 1
    expect(occurrenceCount).toBe(1)
    const wordCount = json.data?.metadata?.wordCount ?? 0
    expect(wordCount).toBeGreaterThanOrEqual(55)
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
      paragraphs.find((para) => !/^Betreff:|^Liebe|^Guten Tag|^Sehr geehrte/i.test(para)) ?? ""
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
    expect(json.data?.generatedDraft.startsWith("Betreff:")).toBe(true)
    expect(json.data?.generatedDraft).toContain("\n\nGuten Tag, Lukas Breuer,")
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
      paragraphs.find((para) => !/^Subject:|^Dear|^Hello|^Liebe|^Guten Tag/i.test(para)) ?? ""
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
    expect(json.data?.generatedDraft.startsWith("Betreff:")).toBe(true)
    expect(json.data?.generatedDraft).toContain("\n\nGuten Tag, Dr. Markus Schneider,")
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
    expect(json.data?.generatedDraft.startsWith("Betreff:")).toBe(true)
    expect(json.data?.generatedDraft).toContain("\n\nGuten Tag, Frank Weber,")
    const generatedDraft = json.data?.generatedDraft ?? ""
    const greetingLine = "Guten Tag, Frank Weber,"
    const occurrenceCount = generatedDraft.split(greetingLine).length - 1
    expect(occurrenceCount).toBe(1)
    const wordCount = json.data?.metadata?.wordCount ?? 0
    expect(wordCount).toBeGreaterThanOrEqual(55)
  })

  it("resolves an English parent greeting when raw text ends with a signed name", async () => {
    const fallbackDraft = [
      "Thank you for bringing this to my attention.",
      "I will look back over what happened this afternoon and come back to you once I have checked the details.",
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
    const greetingLine = json.data?.greeting?.text ?? "Hello Jordan,"
    expect(greetingLine).toBe("Hello Jordan,")
    expect(generatedDraft.startsWith(greetingLine)).toBe(true)
  })

  it("omits greeting resolution for report comments even when raw text contains a sender name", async () => {
    const payload = {
      situation:
        "Sam now contributes more consistently in paired reading, completes follow-up tasks with fewer prompts, and explains his thinking more clearly during independent work.",
      tone: "professional",
      language: "en",
      mode: "report_comment",
      situationRaw: "Sincerely\nJordan Lee\n",
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
    expect(json.data?.greeting?.text ?? "").toBe("")
    expect(json.data?.generatedDraft).not.toMatch(/^Hello,|^Hello\s|^Dear\s|^Guten Tag,|^Hallo\s|^Sehr geehrte/i)
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

describe("/api/draft/generate closing normalization", () => {
  it("keeps exactly one canonical closing block for a normal parent message draft", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Homework update",
          "Dear family,",
          "I wanted to give you a clear update about Noah's homework and the support plan for tomorrow.",
          "Best regards, Dr Greg Blackburn Kind regards, Dr Greg Blackburn",
        ].join("\n\n"),
      ),
    )
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need to send a calm update to Noah's family about homework, support, classroom routines, and the next steps I will put in place tomorrow so the message feels clear and steady.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((generatedDraft.match(/Best regards/gi) ?? []).length).toBe(0)
    expect((generatedDraft.match(/Dr Greg Blackburn/gi) ?? []).length).toBe(1)
    expect(generatedDraft.trim().endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
  })

  it("normalizes a panic scan response down to one closing block", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Dear Jordan Lee,",
          "Thank you for raising the homework concern. I will review it and follow up with the next steps.",
          "Best regards,\nDr Greg Blackburn\n\nKind regards,\nDr Greg Blackburn",
        ].join("\n\n"),
      ),
    )
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "My child came home upset about the homework load and I need a clear response about what happened, how support will look, and which next steps the school can offer this week.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "scan-123",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((generatedDraft.match(/Best regards/gi) ?? []).length).toBe(0)
    expect((generatedDraft.match(/Dr Greg Blackburn/gi) ?? []).length).toBe(1)
  })

  it("normalizes teacher internal notes conversion for voice-to-calm", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Dear family,",
          "I want to share a calm update about the missed homework and the support I will put in place tomorrow.",
          "Kind regards,\nDr Greg Blackburn\n\nBest regards,\nDr Greg Blackburn",
        ].join("\n\n"),
      ),
    )
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "I am frustrated and need to turn these spoken notes into a calm update for the parent about missed homework.",
        tone: "empathetic",
        language: "en",
        mode: "parent_message",
        inputMode: "voice_to_calm",
        sourceType: "voice_transcript",
        voiceSessionId: "voice-123",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
    expect((generatedDraft.match(/Best regards/gi) ?? []).length).toBe(0)
    expect((generatedDraft.match(/Dr Greg Blackburn/gi) ?? []).length).toBe(1)
  })

  it("omits the closing block for report comments", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        "The student has shown more consistent focus this week.\n\nKind regards,\nDr Greg Blackburn",
      ),
    )
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Write a report comment about the student's more consistent focus, calmer participation, stronger listening during paired work, and the steady progress shown across lessons this week.",
        tone: "professional",
        language: "en",
        mode: "report_comment",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).not.toContain("Kind regards")
    expect(generatedDraft).not.toContain("Best regards")
    expect(generatedDraft).not.toContain("Dr Greg Blackburn")
  })

})

describe("/api/draft/generate subject policy", () => {
  it("adds a deterministic subject to a safe draft parent message when the model omits one", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Hello Theo's family,",
          "I wanted to give you a clear update about the homework load this week and the adjustment I will make tomorrow.",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need to send a calm update about Theo's homework this week, explain what I have checked, and set out the support I will put in place tomorrow.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        studentFirstName: "Theo",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.generatedDraft).toContain("Subject: Update on Theo's homework")
    expect(json.data?.formattedDraft?.subject).toBe("Update on Theo's homework")
  })

  it("adds a default subject to panic scan parent replies", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Hello,",
          "I am sorry to hear that your child came home so upset today.",
          "I will speak with the staff involved and look into what happened before I come back to you.",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "My child came home crying after lunchtime and says another pupil pushed him. I am angry that nobody told me what happened.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "scan-123",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.generatedDraft).toContain("Subject: Follow-up on today's concern")
    expect(json.data?.formattedDraft?.subject).toBe("Follow-up on today's concern")
  })

  it("adds a default subject to voice-to-calm parent-facing drafts", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Hello,",
          "I wanted to give you a clear update about the missed homework and the support I will put in place tomorrow.",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Turn these spoken notes into a calm parent update about missed homework, the check-in I will do tomorrow morning, and the support I will keep in place this week.",
        tone: "empathetic",
        language: "en",
        mode: "parent_message",
        inputMode: "voice_to_calm",
        sourceType: "voice_transcript",
        voiceSessionId: "voice-123",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.generatedDraft).toContain("Subject: Update on homework")
    expect(json.data?.formattedDraft?.subject).toBe("Update on homework")
  })
})

describe("/api/draft/generate minimum output safeguard", () => {
  it("recovers a full parent message when the initial draft collapses to only the greeting", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(buildFallbackResult("Hello,"))
      .mockResolvedValueOnce(buildFallbackResult("Hello,"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need to reply to harsh parent notes about repeated upset after maths, explain that I will check the lesson notes, speak with the pupil tomorrow morning, and follow up calmly after reviewing what happened in class.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(generatedDraft).not.toBe("Hello,")
    expect(generatedDraft).toContain("Hello,")
    expect(generatedDraft).toContain("I wanted to give you a clear update")
    expect(generatedDraft).toContain("Kind regards,")
  })

  it("recovers after a teacher-authenticity retry returns a greeting-only fragment", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Hello Jordan,",
            "Thank you for sharing your concerns. I understand how important this is.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(buildFallbackResult("Hello Jordan,"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Parent is upset about the homework load this week and wants a measured response that acknowledges the concern, explains what I checked, and sets out the adjustment I will make tomorrow.",
        situationRaw: "Jordan Lee",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(generatedDraft).not.toBe("Hello Jordan,")
    expect(generatedDraft).not.toContain("Thank you for sharing your concerns")
    expect(generatedDraft).toContain("I'm sorry to hear")
    expect(generatedDraft).toContain("I will speak with the staff involved")
    expect(generatedDraft).toContain("I'll come back to you")
    expect(json.data?.formattedDraft?.paragraphs.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it("does not allow a fallback-marked greeting-only result to surface to the user", async () => {
    fallbackGenerator
      .mockResolvedValueOnce({
        result: {
          text: "Hello,",
          providerMeta: {
            modelUsed: "fallback",
            latencyMs: 10,
          },
        },
        usedFallback: true,
        errorCode: "PROVIDER_ERROR",
      })
      .mockResolvedValueOnce(buildFallbackResult("Hello,"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need a calm but clear parent message about repeated rudeness after lunch, the conversation I will have tomorrow, and the classroom boundary I will restate before the next lesson.",
        tone: "direct",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(generatedDraft).not.toBe("Hello,")
    expect(generatedDraft).toContain("I wanted to give you a clear update")
    expect(json.data?.formattedDraft?.paragraphs.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})

describe("/api/draft/generate report comment boundaries", () => {
  it("strips parent-email structure from direct report comment output", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Reading update",
          "Dear family,",
          "Luca contributes more thoughtfully during class discussion and checks his written work more carefully than before.",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Write a report comment on Luca's more thoughtful class discussion, steadier written work, growing independence in lessons, and stronger follow-through during independent tasks.",
        tone: "professional",
        language: "en",
        mode: "report_comment",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).not.toContain("Subject:")
    expect(generatedDraft).not.toContain("Dear family")
    expect(generatedDraft).not.toContain("Kind regards")
    expect(generatedDraft).not.toContain("Dr Greg Blackburn")
    expect(json.data?.formattedDraft?.subject).toBeUndefined()
    expect(json.data?.formattedDraft?.paragraphs).toEqual([
      "Luca contributes more thoughtfully during class discussion and checks the student's written work more carefully than before.",
    ])
  })

  it("keeps report comments clean after a panic scan parent-message run", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Hello Jordan,",
            "Thank you for bringing this to my attention. I will speak with the staff involved and come back to you tomorrow.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Conduct update",
            "Hello Jordan,",
            "Alex now listens more carefully during paired tasks and contributes more steadily to group discussion.",
            "Best regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )

    const parentRequest = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: "Parent says their child came home upset after a disagreement in class.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "scan-123",
      }),
    })
    await POST(parentRequest)

    const reportRequest = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Write a report comment on Alex's steadier listening during paired tasks, more consistent contributions to group discussion, and clearer focus during independent work this half term.",
        tone: "professional",
        language: "en",
        mode: "report_comment",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        scanId: "scan-456",
      }),
    })

    const response = await POST(reportRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.generatedDraft).toBe(
      "Alex now listens more carefully during paired tasks and contributes more steadily to group discussion.",
    )
    expect(json.data?.greeting?.text ?? "").toBe("")
  })

  it("keeps report comments clean after a parent-message run", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Hello Jordan,",
            "I wanted to give you a clear update about Sam's reading progress this week.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Betreff: Wochenbericht",
            "Guten Tag, Familie Weber,",
            "Sam liest flüssiger, beteiligt sich verlässlicher an Unterrichtsgesprächen und arbeitet bei schriftlichen Aufgaben zunehmend selbstständig.",
            "Mit freundlichen Grüßen,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )

    const parentRequest = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need to send a short parent update on Sam's reading progress this week, his steadier participation, and the support I will keep in place during lessons.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })
    await POST(parentRequest)

    const reportRequest = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Schreibe einen Berichtskommentar zu Sams flüssigerem Lesen, verlässlicherer Beteiligung an Gesprächen, wachsender Selbstständigkeit und sorgfältigerem Arbeiten in schriftlichen Aufgaben in diesem Halbjahr.",
        tone: "professional",
        language: "de",
        mode: "report_comment",
      }),
    })

    const response = await POST(reportRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).not.toContain("Betreff:")
    expect(generatedDraft).not.toContain("Guten Tag")
    expect(generatedDraft).not.toContain("Mit freundlichen Grüßen")
    expect(generatedDraft).toContain("Sam liest flüssiger")
  })

  it("uses high-confidence name inference and repairs malformed pronoun grammar in report comments", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Them performance in reading has improved noticeably this term.",
          "They contributes more confidently during paired discussion and approaches written work with greater care.",
        ].join("\n\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Write a report comment on Jane's stronger reading fluency, more confident paired discussion, and more careful written work this term.",
        tone: "professional",
        language: "en",
        mode: "report_comment",
        studentFirstName: "Jane",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(generatedDraft).not.toContain("Them performance")
    expect(generatedDraft).not.toContain("They contributes")
    expect(generatedDraft).toContain("Her performance in reading has improved noticeably this term.")
    expect(generatedDraft).toContain("She contributes more confidently during paired discussion")
    expect(json.data?.metadata?.pronounResolution?.resolvedPreference).toBe("she")
  })
})

describe("/api/draft/generate teacher-authentic style guard", () => {
  it("retries when the first draft uses generic AI empathy phrasing", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Dear family,",
            "Thank you for sharing your concerns about the homework load.",
            "I will gather the details, monitor the situation, and prepare a practical plan before I reply fully.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Dear family,",
            "I checked the homework set this week and can see why it felt too heavy at home.",
            "I will shorten tomorrow's follow-up task and go over the expectations with Noah in class.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Parent says the homework load this week left Noah upset and working far longer than expected, and asks for a clear response about what will change.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(json.data.generatedDraft).not.toContain("Thank you for sharing your concerns")
    expect(json.data.generatedDraft).not.toContain("gather the details")
    expect(json.data.generatedDraft).not.toContain("monitor the situation")
    expect(json.data.generatedDraft).not.toContain("prepare a practical plan")
    expect(json.data.generatedDraft).toContain("I checked the homework set this week")
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
