import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { generateDraft } from "@/lib/ai/provider"
import {
  buildFallbackDraft,
  buildSourceGroundedTeacherDraftFallbackResult,
  generateDraftWithFallback,
} from "@/lib/draft/fallback"
import { POST } from "@/app/api/draft/generate/route"
import { buildUsageResponse, getCurrentMonthKey, incrementUsage } from "@/lib/usage"
import { getUserEntitlements } from "@/lib/entitlements"
import { isInternalQaUid, shouldRespectUsageLimit } from "@/lib/auth/internal-qa"
import { resolveDraftEntitlement } from "@/lib/draft-entitlements"
import { detectBlockedLanguage } from "@/lib/safety"
import { runSafetyEngine } from "@/src/lib/safetyEngine"
import { evaluateDraftQuality, isOutputWorseThanSource } from "@/lib/draft/quality-evaluation"
import { calibrateLengthTarget } from "@/lib/draft/length-calibration"
import { classifyTeacherIntent } from "@/lib/draft/intent-classification"
import {
  applyRegisterCorrections,
  detectRegisterViolations,
} from "@/lib/draft/register-accuracy"

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

const LOW_RISK_SAFETY_RESULT = {
  riskScore: 14,
  riskLevel: "low",
  triggeredSignals: [],
  toneClass: "collaborative",
  topicSensitivity: "low",
  reactionForecast: {
    collaborative: 52,
    concerned: 22,
    defensive: 8,
    hostile: 0,
    confused: 18,
  },
  explanationLines: [],
  documentationModeAvailable: false,
  professionalRiskFlags: [],
  structuralImbalance: false,
} as const

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

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

function countSentences(text: string) {
  const matches = text.match(/[.!?]+(?=\s|$)/g)
  return matches ? matches.length : 0
}

function buildLengthTarget(sourceText: string, hasMultipleIssues = false) {
  return calibrateLengthTarget({
    sourceWordCount: countWords(sourceText),
    sourceSentenceCount: countSentences(sourceText),
    intent: classifyTeacherIntent(sourceText).intent,
    hasMultipleIssues,
  })
}

function buildTeacherDraftRequest(situation: string, tone = "professional") {
  return new Request("https://example.com/api/draft/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    },
    body: JSON.stringify({
      situation,
      tone,
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      inputIntent: "teacher_draft",
    }),
  })
}

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn().mockResolvedValue({
    uid: "test-uid",
    decodedToken: {
      name: "Greg",
    },
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

vi.mock("@/lib/ai/provider", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/provider")>("@/lib/ai/provider")
  return {
    ...actual,
    generateDraft: vi.fn(),
  }
})

vi.mock("@/lib/safety", () => ({
  detectSensitiveContent: vi.fn().mockImplementation((text) => ({ sanitized: text, matches: [] })),
  detectBlockedLanguage: vi.fn().mockReturnValue({ detected: false, tier: null, matches: [], redactedPreview: "" }),
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

vi.mock("@/src/lib/safetyEngine", () => ({
  runSafetyEngine: vi.fn(),
}))

vi.mock("@/lib/usage", () => ({
  FREE_TIER_LIMIT: 5,
  buildUsageResponse: vi.fn().mockReturnValue({
    currentMonthUsage: 1,
    limit: 5,
    remaining: 4,
    plan: "free",
    unlimited: false,
  }),
  incrementUsage: vi.fn().mockResolvedValue({
    month: "2025-01",
    generationCount: 1,
    lastReset: new Date().toISOString(),
  }),
  getCurrentMonthKey: vi.fn().mockReturnValue("2025-01"),
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: vi.fn().mockResolvedValue({
    plan: "free",
    usage: {
      plan: "free",
      currentMonthUsage: 0,
      limit: 5,
      remaining: 5,
      unlimited: false,
    },
    usageRecord: {
      month: "2025-01",
      generationCount: 0,
      lastReset: new Date().toISOString(),
    },
    isProSubscriber: false,
  }),
}))

vi.mock("@/lib/auth/internal-qa", () => ({
  isInternalQaUid: vi.fn().mockReturnValue(false),
  shouldRespectUsageLimit: vi.fn().mockReturnValue(true),
}))

vi.mock("@/lib/draft-entitlements", () => ({
  hasDraftEntitlementAccess: (entitlement: { hasAccess: boolean; status: string }) =>
    entitlement.hasAccess && (entitlement.status === "active" || entitlement.status === "trial"),
  resolveDraftEntitlement: vi.fn().mockResolvedValue({
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
    source: "local_disabled",
    localEntitlements: {
      plan: "free",
      usage: {
        plan: "free",
        currentMonthUsage: 0,
        limit: 5,
        remaining: 5,
        unlimited: false,
      },
      usageRecord: {
        month: "2025-01",
        generationCount: 0,
        lastReset: new Date().toISOString(),
      },
      isProSubscriber: false,
    },
  }),
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
  buildFallbackDraft: vi.fn().mockImplementation(() =>
    [
      "Subject: Classroom update",
      "",
      "Dear Parent/Carer,",
      "",
      "Thank you for your message about this concern.",
      "",
      "I will look into this carefully in school and come back with a clear update.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n"),
  ),
  buildSourceGroundedTeacherDraftFallbackResult: vi.fn().mockResolvedValue(null),
  buildTeacherNotesRecoveryDraft: vi.fn(),
  isSafeDraftTeacherNotesRecovery: vi.fn().mockReturnValue(false),
  generateDraftWithFallback: vi.fn(),
}))

const fallbackGenerator = vi.mocked(generateDraftWithFallback)
const mockedGenerateDraft = vi.mocked(generateDraft)
const mockedBuildFallbackDraft = vi.mocked(buildFallbackDraft)
const mockedBuildSourceGroundedTeacherDraftFallbackResult = vi.mocked(
  buildSourceGroundedTeacherDraftFallbackResult,
)
const mockedBuildUsageResponse = vi.mocked(buildUsageResponse)
const mockedIncrementUsage = vi.mocked(incrementUsage)
const mockedGetCurrentMonthKey = vi.mocked(getCurrentMonthKey)
const mockedGetUserEntitlements = vi.mocked(getUserEntitlements)
const mockedShouldRespectUsageLimit = vi.mocked(shouldRespectUsageLimit)
const mockedIsInternalQaUid = vi.mocked(isInternalQaUid)
const mockedAuthorizeFirebaseRequest = vi.mocked(authorizeFirebaseRequest)
const mockedResolveDraftEntitlement = vi.mocked(resolveDraftEntitlement)
const mockedRunSafetyEngine = vi.mocked(runSafetyEngine)
const mockedDetectBlockedLanguage = vi.mocked(detectBlockedLanguage)

beforeEach(() => {
  vi.clearAllMocks()
  fallbackGenerator.mockReset()
  fallbackGenerator.mockResolvedValue(
    buildFallbackResult(
      [
        "Dear Parent/Carer,",
        "",
        "Thank you for getting in touch.",
        "",
        "I will respond to this carefully and keep the expectation clear.",
        "",
        "Kind regards,",
        "Greg",
      ].join("\n"),
    ),
  )
  mockedGenerateDraft.mockReset()
  mockedGenerateDraft.mockResolvedValue({
    text: "Default draft",
    providerMeta: {
      modelUsed: "test-model",
      latencyMs: 10,
    },
  })
  mockedBuildFallbackDraft.mockClear()
  mockedBuildSourceGroundedTeacherDraftFallbackResult.mockReset()
  mockedBuildSourceGroundedTeacherDraftFallbackResult.mockResolvedValue(null)
  mockedRunSafetyEngine.mockReset()
  mockedRunSafetyEngine.mockImplementation(async ({ messageDirection }) => {
    if (messageDirection !== "teacher_to_parent") {
      return null
    }

    return LOW_RISK_SAFETY_RESULT as any
  })
  mockedDetectBlockedLanguage.mockReset()
  mockedDetectBlockedLanguage.mockReturnValue({
    detected: false,
    tier: null,
    matches: [],
    redactedPreview: "",
  } as any)
  mockedBuildUsageResponse.mockReturnValue({
    currentMonthUsage: 1,
    limit: 5,
    remaining: 4,
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
      limit: 5,
      remaining: 5,
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
    decodedToken: {
      name: "Greg",
    },
    firestore: createFirestoreStub(),
  } as any)
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
    source: "local_disabled",
    localEntitlements: {
      plan: "free",
      usage: {
        plan: "free",
        currentMonthUsage: 0,
        limit: 5,
        remaining: 5,
        unlimited: false,
      },
      usageRecord: {
        month: "2025-01",
        generationCount: 0,
        lastReset: new Date().toISOString(),
      },
      isProSubscriber: false,
    },
  } as any)
})

describe("Quality Framework v1 integration", () => {
  it("Scenario A: keeps an already strong draft in copy-edit-only mode", async () => {
    const source = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I understand your concern, and I will continue to handle this calmly in class.",
      "",
      "The expectation is that phones stay away during lessons, and I will keep that clear and consistent.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    const response = await POST(buildTeacherDraftRequest(source, "professional"))
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    const quality = evaluateDraftQuality({
      sourceText: source,
      candidateText: generatedDraft,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(response.status).toBe(200)
    expect(json.data?.metadata?.modelUsed).toBe("teacher-draft-copy-edit-only")
    expect(json.data?.teacherDraftFeedback?.verdict).toBe("already_strong")
    expect(quality.verdict).toBe("already_strong")
    expect(quality.violations).toEqual([])
  })

  it("Scenario B: improves a blunt draft while keeping the boundary", async () => {
    const source = [
      "Dear Parent/Carer,",
      "",
      "I can't make exceptions here. These rules apply to everyone.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")
    const candidate = [
      "Dear Parent/Carer,",
      "",
      "I need to keep the expectation clear and consistent for everyone in class.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(candidate))

    const response = await POST(buildTeacherDraftRequest(source, "direct"))
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    const quality = evaluateDraftQuality({
      sourceText: source,
      candidateText: generatedDraft,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(response.status).toBe(200)
    expect(quality.verdict).toBe("improved")
    expect(quality.violations.filter((violation) => violation.severity === "blocking")).toEqual([])
  })

  it("Scenario C: flags boundary dilution as needs_rewrite", () => {
    const source = "Phones will not be used during lessons."
    const candidate = "We will review whether phones might be permitted in some lessons going forward."

    const quality = evaluateDraftQuality({
      sourceText: source,
      candidateText: candidate,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(quality.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "BOUNDARY_DILUTION",
          severity: "blocking",
        }),
      ]),
    )
    expect(quality.verdict).toBe("needs_rewrite")
  })

  it("Scenario D: auto-corrects American register before retry", () => {
    const candidate = [
      "Dear Parent/Carer,",
      "",
      "Please reach out moving forward regarding the action items for this week.",
      "",
      "I want the expectation to stay clear in class, and I will follow up if needed.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    expect(detectRegisterViolations(candidate).map((violation) => violation.label)).toEqual(
      expect.arrayContaining(["reach out", "moving forward", "action items"]),
    )

    const { corrected } = applyRegisterCorrections(candidate)

    expect(corrected).toContain("get in touch")
    expect(corrected).toContain("next steps")
    expect(corrected.toLowerCase()).not.toContain("reach out")
    expect(corrected.toLowerCase()).not.toContain("moving forward")
    expect(detectRegisterViolations(corrected)).toHaveLength(0)
  })

  it("Scenario E: flags close-to-invite intent drift as needs_rewrite", () => {
    const source = "I wanted to keep you informed. No reply is needed."
    const candidate = "I wanted to keep you informed. Please don't hesitate to get in touch."

    const quality = evaluateDraftQuality({
      sourceText: source,
      candidateText: candidate,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(quality.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "INTENT_DRIFT",
          severity: "blocking",
        }),
      ]),
    )
    expect(quality.verdict).toBe("needs_rewrite")
  })

  it("Scenario F: keeps voice drift as advisory-only when below the rewrite threshold", () => {
    const source = [
      "I understand your concern.",
      "I will speak with Lucy tomorrow.",
      "I will keep the rule clear.",
      "I will handle this calmly.",
      "I will keep you informed.",
      "I will stay consistent.",
      "I will stay calm.",
    ].join(" ")
    const candidate = [
      "Thank you for raising this concern, and the wider classroom context will be considered tomorrow.",
      "The rule will remain clear across the class, with routines kept steady for everyone involved.",
      "Further clarification will be provided in class once the expectation has been restated calmly.",
    ].join(" ")

    const quality = evaluateDraftQuality({
      sourceText: source,
      candidateText: candidate,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(quality.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "SENTENCE_LENGTH_DRIFT", severity: "advisory" }),
        expect.objectContaining({ category: "PERSON_DRIFT", severity: "advisory" }),
      ]),
    )
    expect(quality.verdict).toBe("improved")
  })

  it("Scenario G: combines length overruns with other advisories into needs_rewrite", () => {
    const source =
      "Phones stay away during lessons. I will keep that expectation clear for everyone in class."
    const candidate = [
      "Thank you for your message about the classroom routine.",
      "Phones stay away during lessons, and I want to explain this in more detail for everyone involved.",
      "I am setting this out because it helps the routines stay predictable for the class.",
      "I am also adding further detail because that can be useful in understanding the wider picture.",
      "Working together can help keep the expectations settled for everyone in class.",
      "I will continue to manage this calmly and consistently each day.",
    ].join(" ")

    const quality = evaluateDraftQuality({
      sourceText: source,
      candidateText: candidate,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(quality.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "LENGTH_EXCEEDED", severity: "advisory" }),
        expect.objectContaining({ category: "MESSAGE_EXPANSION", severity: "advisory" }),
        expect.objectContaining({ category: "GENERIC_REASSURANCE_FILLER", severity: "advisory" }),
      ]),
    )
    expect(quality.verdict).toBe("needs_rewrite")
  })

  it("Scenario H: returns copy-edit-only when the output is worse than the source", async () => {
    const source = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I understand your concern, and I will continue to handle this calmly in class.",
      "",
      "The expectation is that phones stay away during lessons, and I will keep that clear and consistent.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")
    const candidate = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch.",
      "",
      "I understand your concern, and I will continue to handle this calmly in class.",
      "",
      "The expectation is that phones stay away during lessons, and I will keep that clear and consistent while working together.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")
    const sourceQuality = evaluateDraftQuality({
      sourceText: source,
      candidateText: source,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })
    const candidateQuality = evaluateDraftQuality({
      sourceText: source,
      candidateText: candidate,
      language: "en",
      teacherDraftMode: true,
      lengthTarget: buildLengthTarget(source),
    })

    expect(
      isOutputWorseThanSource({
        sourceText: source,
        candidateText: candidate,
        sourceViolations: sourceQuality.violations,
        candidateViolations: candidateQuality.violations,
        similarity: candidateQuality.similarity,
        sourceWordCount: sourceQuality.wordCount,
        candidateWordCount: candidateQuality.wordCount,
      }),
    ).toBe(true)

    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(candidate))
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    const response = await POST(buildTeacherDraftRequest(source, "direct"))
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    const qualityLogCall = consoleSpy.mock.calls.find(
      (call) => call[0] === "[quality-framework] result",
    )

    expect(response.status).toBe(200)
    expect(json.data?.metadata?.modelUsed).toBe("teacher-draft-copy-edit-only")
    expect(json.data?.teacherDraftFeedback?.verdict).toBe("already_strong")
    expect(generatedDraft).toContain(
      "The expectation is that phones stay away during lessons, and I will keep that clear and consistent.",
    )
    expect(generatedDraft).not.toContain("working together")
    expect(qualityLogCall).toBeDefined()
    expect(qualityLogCall?.[1]).toEqual(
      expect.objectContaining({
        verdict: "already_strong",
        worseThanSource: true,
        intentPreserved: true,
        lengthBand: "standard",
        modelUsed: "teacher-draft-copy-edit-only",
      }),
    )

    consoleSpy.mockRestore()
  })
})
