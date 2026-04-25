import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest"
import { getFirebaseAdmin } from "@/lib/firebase/admin"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { generateDraft } from "@/lib/ai/provider"
import { generateDraftWithFallback } from "@/lib/draft/fallback"
import { POST } from "@/app/api/draft/generate/route"
import { buildUsageResponse, getCurrentMonthKey, incrementUsage } from "@/lib/usage"
import { getUserEntitlements } from "@/lib/entitlements"
import { isInternalQaUid, shouldRespectUsageLimit } from "@/lib/auth/internal-qa"
import { resolveDraftEntitlement } from "@/lib/draft-entitlements"
import { detectBlockedLanguage } from "@/lib/safety"
import { runSafetyEngine } from "@/src/lib/safetyEngine"

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

const lucyParentEmail = [
  "Subject: Concern about how Lucy was treated in class",
  "",
  "Hello,",
  "",
  "Lucy came home quite upset today and told me she was asked to put her phone away during your lesson.",
  "",
  "We have previously explained that Lucy uses her phone for mindfulness purposes when she feels overwhelmed, and we would expect some flexibility around this rather than her being singled out in front of others.",
  "",
  "She felt embarrassed and said the way it was handled made her uncomfortable. I'm sure that wasn't your intention, but it's important that her needs are understood and respected.",
  "",
  "I would appreciate it if you could reconsider how this is approached going forward.",
  "",
  "Kind regards,",
  "Lucy's Dad",
].join("\n")

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

function normalizeSimilarityText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getWordSequenceSimilarity(source: string, candidate: string) {
  const sourceTokens = normalizeSimilarityText(source).split(" ").filter(Boolean)
  const candidateTokens = normalizeSimilarityText(candidate).split(" ").filter(Boolean)

  if (sourceTokens.length === 0 || candidateTokens.length === 0) {
    return sourceTokens.length === candidateTokens.length ? 1 : 0
  }

  const dp = Array(candidateTokens.length + 1).fill(0)
  for (const sourceToken of sourceTokens) {
    let previousDiagonal = 0
    for (let index = 0; index < candidateTokens.length; index += 1) {
      const nextDiagonal = dp[index + 1]
      if (sourceToken === candidateTokens[index]) {
        dp[index + 1] = previousDiagonal + 1
      } else {
        dp[index + 1] = Math.max(dp[index + 1], dp[index])
      }
      previousDiagonal = nextDiagonal
    }
  }

  return dp[candidateTokens.length] / Math.max(sourceTokens.length, candidateTokens.length)
}

function countNormalizedWords(text: string) {
  const normalized = normalizeSimilarityText(text)
  return normalized ? normalized.split(" ").filter(Boolean).length : 0
}

const TRUST_GRADE_FAILURE_MESSAGE =
  "Unable to generate a compliant draft. Please rephrase or contact support."
const MOCK_FREE_TIER_LIMIT = 5

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn().mockResolvedValue({
    uid: "test-uid",
    decodedToken: {
      name: "Dr Greg Blackburn",
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
  }),
  incrementUsage: vi.fn().mockResolvedValue({ generationCount: 1 }),
  getCurrentMonthKey: vi.fn().mockReturnValue("2025-01"),
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: vi.fn().mockResolvedValue({
    plan: "free",
    usage: {
      currentMonthUsage: 0,
      limit: 5,
      remaining: 5,
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
        limit: 5,
        remaining: 5,
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

vi.mock("@/lib/draft/fallback", () => {
  const isSafeDraftTeacherNotesRecovery = (context: {
    mode?: string
    generationMetadata?: { mode?: string; direction?: string }
  }) =>
    context.mode === "parent_message" &&
    context.generationMetadata?.mode === "safe_draft" &&
    context.generationMetadata?.direction === "teacher_internal_notes"

  const buildTeacherNotesRecoveryDraft = (
    context: { sourceSituation?: string; studentFirstName?: string; teacherNoteIssueClusters?: string[] },
    greetingLine: string,
    closingBlock: string,
  ) => {
    const source = (context.sourceSituation ?? "").toLowerCase()
    const studentName = context.studentFirstName ?? "the student"
    const clusters = context.teacherNoteIssueClusters ?? []
    if (clusters.length > 1) {
      return [
        "Subject: Update on punctuality and homework",
        greetingLine,
        `I wanted to send a brief update about ${studentName}, as there have been recent concerns with punctuality, classroom behaviour, and homework.`,
        `I will follow these points up in school, restate the expectations around arriving on time, speak with ${studentName} about the classroom expectations, and go through the missing homework so the next steps are clear.`,
        "I wanted to make you aware of the full pattern early, and I will follow up again once I have checked these points in school.",
        closingBlock,
      ].join("\n\n")
    }
    const punctuality = source.includes("late") || source.includes("lateness")
    return [
      punctuality ? "Subject: Update on punctuality" : "Subject: Update on homework",
      greetingLine,
      punctuality
        ? "I wanted to send a brief update about lateness to class and the start of lessons."
        : "I wanted to send a brief update about homework that has not been completed and the next steps in school.",
      punctuality
        ? "I will follow this up in school, make the expectations around arrival clear, and keep the start of lessons consistent."
        : "I will go through what is missing in class, make the next task clear, and check in again at school.",
      "If a further update would be helpful once I have followed this up, I will come back to you.",
      closingBlock,
    ].join("\n\n")
  }

  const buildFallbackDraft = (context: {
    sourceSituation?: string
    greeting?: { text?: string }
    greetingFinal?: boolean
    mode?: string
    language?: string
    tone?: string
    studentFirstName?: string
    teacherNoteIssueClusters?: string[]
    generationMetadata?: { mode?: string; direction?: string }
  }) => {
    if (isSafeDraftTeacherNotesRecovery(context)) {
      const greetingLine =
        context.greetingFinal && context.greeting?.text
          ? context.greeting.text
          : context.language === "de"
            ? "Guten Tag,"
            : "Hello,"
      const closingBlock = context.language === "de" ? "Mit freundlichen Grüßen" : "Kind regards,"
      return buildTeacherNotesRecoveryDraft(context, greetingLine, closingBlock)
    }

    const source = (context.sourceSituation ?? "").toLowerCase()
    const tone = context.tone ?? "professional"
    const homework = source.includes("homework")
    const bullying = source.includes("pushed") || source.includes("unsafe") || source.includes("bully")
    const grading = source.includes("mark") || source.includes("grade")
    const subject = bullying
      ? "Subject: Follow-up on today's incident"
      : grading
        ? "Subject: Update on recent marking"
        : homework
          ? "Subject: Update on homework"
          : "Subject: Classroom update"
    const greetingLine =
      context.greetingFinal && context.greeting?.text ? context.greeting.text : "Hello,"
    const openingByTone = {
      warm: homework
        ? "I wanted to send a quick update about the homework pattern that has been building recently."
        : bullying
          ? "Thank you for getting in touch so quickly about what happened today."
          : "Thank you for getting in touch about this concern.",
      professional: homework
        ? "I wanted to let you know that homework has been handed in late more regularly over the past few weeks."
        : bullying
          ? "Thank you for your message about what happened today."
          : "Thank you for your message about this concern.",
      direct: homework
        ? "Homework has been handed in late, and it is becoming a pattern."
        : bullying
          ? "I have read your message about what happened today."
          : "I have read your message about this concern.",
      empathetic: homework
        ? "I wanted to get in touch about homework, as it has been difficult to hand it in on time lately."
        : bullying
          ? "I am sorry to hear about what happened today."
          : "Thank you for letting me know about this concern.",
    } as const
    const actionByTone = {
      warm: homework
        ? "I will go through what is missing in class, make the next task clear, and help re-establish a steadier routine."
        : bullying
          ? "I will speak with the staff involved, check what happened today, and follow this up promptly in school."
          : "I will look into this carefully in school and follow it up promptly.",
      professional: homework
        ? "I will go through what is missing in class, make the next task and deadline clear, and check that the expectations are understood."
        : bullying
          ? "I will speak with the staff involved, check what happened today, and follow this up promptly in school."
          : "I will look into this carefully in school and come back with a clear update.",
      direct: homework
        ? "I will go through what is missing tomorrow, make the next deadline clear, and expect the work to be handed in on time from this point."
        : bullying
          ? "I will speak with the staff involved today, establish what happened, and come back to you once that has been checked."
          : "I will check this today and come back once the detail is clear.",
      empathetic: homework
        ? "I will check in in class, go through what is missing, and make sure the next task feels clear rather than overwhelming."
        : bullying
          ? "I will speak with the staff involved, check what happened today, and follow this up promptly so I can give you a clear update."
          : "I will look into this carefully in school and come back with a clear update.",
    } as const
    const followUpByTone = {
      warm:
        "If it would help, please do let me know if you are seeing the same pattern at home, and I will follow up again after I have checked this in school.",
      professional:
        "I wanted to make you aware of the pattern early, and I will follow up again if a further update is needed.",
      direct: "I wanted to raise this now so it can be addressed before it becomes a wider pattern.",
      empathetic:
        "I did not want this to become a bigger source of pressure, so I wanted to let you know now and I will follow up again after I have checked in at school.",
    } as const

    return [
      subject,
      greetingLine,
      openingByTone[tone as keyof typeof openingByTone],
      actionByTone[tone as keyof typeof actionByTone],
      bullying ? "I will come back to you as soon as I have established what happened." : followUpByTone[tone as keyof typeof followUpByTone],
      "Kind regards,",
    ].join("\n")
  }

  return {
    ALLOWED_TONES: ["warm", "professional", "direct", "empathetic"],
    buildFallbackDraft,
    buildTeacherNotesRecoveryDraft,
    isSafeDraftTeacherNotesRecovery,
    generateDraftWithFallback: vi.fn(),
  }
})

const fallbackGenerator = vi.mocked(generateDraftWithFallback)
const mockedGenerateDraft = vi.mocked(generateDraft)
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
  fallbackGenerator.mockResolvedValue(buildFallbackResult(getLongDraft()))
  mockedGenerateDraft.mockReset()
  mockedGenerateDraft.mockResolvedValue({
    text: [
      "Incident Record",
      "",
      "Date: 2026-03-15",
      "Location: Not specified",
      "Observed behaviour: The student spoke over others during the lesson.",
      "Teacher response: The teacher recorded the incident for follow-up.",
      "Follow-up action: Further review is required.",
      "",
      "This record is for documentation purposes.",
    ].join("\n"),
    providerMeta: {
      modelUsed: "test-model",
      latencyMs: 10,
    },
  })
  mockedRunSafetyEngine.mockReset()
  mockedDetectBlockedLanguage.mockReset()
  mockedDetectBlockedLanguage.mockReturnValue({
    detected: false,
    tier: null,
    matches: [],
    redactedPreview: "",
  })
  mockedRunSafetyEngine.mockImplementation(async ({ rawMessage, messageDirection }) => {
    if (messageDirection !== "teacher_to_parent") {
      return null
    }

    const normalized = rawMessage.toLowerCase()
    if (normalized.trim().split(/\s+/).length < 10) {
      return null
    }

    const triggeredSignals: Array<Record<string, unknown>> = []
    const professionalRiskFlags: Array<Record<string, string>> = []

    if (/head teacher|if this continues/.test(normalized)) {
      triggeredSignals.push({
        id: "esc_administrative_threat",
        category: "escalation",
        label: "Administrative escalation",
        weight: 9,
        patterns: ["head teacher"],
        matchMode: "any",
        proximityBoost: false,
        detectionNote: "Strong escalation signal",
      })
    }

    if (/refuses to|deliberately disrupts|always\b|never\b/.test(normalized)) {
      triggeredSignals.push({
        id: "acc_refusal_language",
        category: "accusation",
        label: "Refusal language",
        weight: 8,
        patterns: ["refuses to"],
        matchMode: "any",
        proximityBoost: false,
        detectionNote: "Accusatory wording",
      })
    }

    if (/\badhd\b|\bautism\b|\bdyslexia\b|\banxiety\b|\bdepression\b/.test(normalized)) {
      professionalRiskFlags.push({
        signalId: "pro_medical_speculation",
        label: "Medical or diagnostic speculation",
        matchedPhrase: "ADHD",
      })
    }

    if (/\bdeliberately\b|\bintentionally\b|\bon purpose\b/.test(normalized)) {
      professionalRiskFlags.push({
        signalId: "pro_motive_attribution",
        label: "Motive attribution",
        matchedPhrase: "deliberately disrupts the class",
      })
    }

    if (/emotional problems|emotional issues|psychological issues|mental health concerns/.test(normalized)) {
      professionalRiskFlags.push({
        signalId: "pro_psychological_interpretation",
        label: "Psychological interpretation",
        matchedPhrase: "seems to have emotional problems",
      })
    }

    const highRisk = triggeredSignals.length > 0
    const mediumRisk = !highRisk && professionalRiskFlags.length > 0

    return {
      riskScore: highRisk ? 82 : mediumRisk ? 48 : 14,
      riskLevel: highRisk ? "high" : mediumRisk ? "medium" : "low",
      triggeredSignals: triggeredSignals as any,
      toneClass: highRisk ? "accusatory" : mediumRisk ? "clinical" : "collaborative",
      topicSensitivity: professionalRiskFlags.length > 0 ? "high" : highRisk ? "medium" : "low",
      reactionForecast: highRisk
        ? {
            collaborative: 10,
            concerned: 15,
            defensive: 45,
            hostile: 20,
            confused: 10,
          }
        : mediumRisk
          ? {
              collaborative: 20,
              concerned: 20,
              defensive: 35,
              hostile: 0,
              confused: 25,
            }
          : {
              collaborative: 52,
              concerned: 22,
              defensive: 8,
              hostile: 0,
              confused: 18,
            },
      explanationLines: [],
      documentationModeAvailable:
        highRisk || professionalRiskFlags.length > 0 || normalized.includes("incident"),
      professionalRiskFlags: professionalRiskFlags as any,
      structuralImbalance: false,
    }
  })
  mockedBuildUsageResponse.mockReturnValue({
    currentMonthUsage: 1,
    limit: MOCK_FREE_TIER_LIMIT,
    remaining: MOCK_FREE_TIER_LIMIT - 1,
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
      limit: MOCK_FREE_TIER_LIMIT,
      remaining: MOCK_FREE_TIER_LIMIT,
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
      name: "Dr Greg Blackburn",
    },
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
        limit: MOCK_FREE_TIER_LIMIT,
        remaining: MOCK_FREE_TIER_LIMIT,
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

vi.mock("@/lib/draft/blocked-response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/draft/blocked-response")>(
    "@/lib/draft/blocked-response",
  )
  return actual
})

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

vi.mock("@/lib/draft/signature", async () => {
  const actual = await vi.importActual<typeof import("@/lib/draft/signature")>(
    "@/lib/draft/signature",
  )
  return actual
})

vi.mock("@/lib/draft/teacher-signature", async () => {
  const actual = await vi.importActual<typeof import("@/lib/draft/teacher-signature")>(
    "@/lib/draft/teacher-signature",
  )
  return actual
})

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

  it("returns a teacher intent label in metadata without storing source text in analytics fields", async () => {
    const payload = {
      situation:
        "A parent has complained that homework expectations are unclear, the workload feels overwhelming at home, and they want a calm reply that explains the next steps clearly.",
      tone: "professional",
      language: "en",
      mode: "parent_message",
      messageType: "parent_complaint",
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
    expect(json.data?.metadata?.teacherIntent).toBe("respond_to_complaint")
    expect(JSON.stringify(json.data?.metadata)).not.toContain(payload.situation)
  })

  it("returns the forward-safe rewrite flag in metadata for rewrite requests", async () => {
    const payload = {
      situation:
        "Please rewrite this parent message so it stays calm, clear, easy to defend if forwarded, and still explains the next steps in a professional way.",
      tone: "professional",
      language: "en",
      mode: "parent_message",
      rewrite: true,
      forwardSafeRewrite: true,
      previousDraft:
        "Your child keeps refusing instructions and this is becoming unacceptable.",
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
    expect(json.data?.metadata?.forwardSafeRewrite).toBe(true)
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

  it("uses Safe Draft coaching copy for a very short hostile teacher note", async () => {
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: "Your child is lying about what happened in class.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(422)

    const json = await response.json()
    expect(json.error.code).toBe("INSUFFICIENT_INPUT")
    expect(json.error.message).toContain("too accusatory")
    expect(json.error.message).toContain("Describe what you observed or what was said")
    expect(json.error.message).not.toContain("Gmail UI noise")
    expect(json.error.message).not.toContain("parent concern")
    expect(json.error.message).not.toContain("doesn?f")
    expect(json.error.message).not.toContain("Ã")
    expect(json.error.message).not.toContain("Â¿")
  })

  it("uses Safe Draft coaching copy for a short motive-attribution note", async () => {
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: "She is being manipulative.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(422)

    const json = await response.json()
    expect(json.error.code).toBe("INSUFFICIENT_INPUT")
    expect(json.error.message).toContain("too accusatory")
    expect(json.error.message).toContain("avoid labels and motive attribution")
    expect(json.error.message).not.toContain("Gmail UI noise")
    expect(json.error.message).not.toContain("parent concern")
    expect(json.error.message).not.toContain("Ã")
  })

  it("keeps the Gmail-noise insufficiency copy for short Panic Scan inbound notes", async () => {
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: "From: Parent\nSent from my iPhone",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        scanId: "scan-123",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(422)

    const json = await response.json()
    expect(json.error.code).toBe("INSUFFICIENT_INPUT")
    expect(json.error.message).toContain("After removing Gmail UI noise")
    expect(json.error.message).toContain("describe the parent concern")
    expect(json.error.message).not.toContain("too accusatory")
    expect(json.error.message).not.toContain("Ã")
    expect(json.error.message).not.toContain("Â¿")
    expect(json.error.message).not.toContain("doesn?f")
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
    expect(generatedDraft).toMatch(/Mit freundlichen Gr[üu]ßen,\s+Dr Greg Blackburn\s*$/)
  })

  it("uses the authenticated teacher profile name as the default sign-off in parent-message mode", async () => {
    const fallbackText = [
      "Dear Parent/Carer,",
      "Thank you for your message. I will look into this and follow up shortly.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackText))
    const payload = {
      situation:
        "Need a calm parent update about a homework concern and the next steps I will check tomorrow morning in school.",
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
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).toMatch(/Kind regards,\s+Dr Greg Blackburn\s*$/)
    expect((generatedDraft.match(/Dr Greg Blackburn/g) ?? []).length).toBe(1)
  })

  it("uses the exact authenticated profile name Dr Greg Blackburn in the final parent-message sign-off", async () => {
    const fallbackText = [
      "Dear Parent/Carer,",
      "Thank you for your message. I will review this carefully and come back to you with the next steps.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackText))
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need a calm parent update about a homework concern, the support I will put in place tomorrow, and the follow-up I will send after checking the detail in school.",
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.formattedDraft?.paragraphs.at(-1)).toBe("Kind regards,\nDr Greg Blackburn")
    expect(json.data?.generatedDraft).not.toContain("Your child's teacher")
  })

  it("still appends the final parent-message sign-off when the request carries a false auto-append flag", async () => {
    const fallbackText = [
      "Dear Parent/Carer,",
      "Thank you for your message. I will review this tomorrow and follow up with the next steps.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackText))
    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Need a calm parent update about homework, explain what I will check tomorrow, and confirm the follow-up I will send after that review.",
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        signature: {
          line1: "Dr Greg Blackburn",
          autoAppendParentMessage: false,
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.generatedDraft).toContain("Kind regards,\nDr Greg Blackburn")
    expect(json.data?.formattedDraft?.paragraphs.at(-1)).toBe("Kind regards,\nDr Greg Blackburn")
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
    expect(generatedDraft).toMatch(/Kind regards,\s+Dr Greg Blackburn\s*$/)
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
    expect(generatedDraft).toContain(`\n\n${greetingLine}\n\n`)
  })

  it("preserves titled English parent greetings from signed raw text", async () => {
    const fallbackDraft = [
      "Thank you for getting in touch about this.",
      "I will review what happened and follow up with the next steps.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackDraft))
    const payload = {
      situation: englishGreetingSituation,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      situationRaw: "Sharing a follow-up.\nKind regards\nMs Parker\n",
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
    expect(json.data?.greeting?.text).toBe("Dear Ms Parker,")
    expect(generatedDraft).toContain("\n\nDear Ms Parker,\n\n")
    expect(generatedDraft).not.toContain("Hello Parker")
  })

  it("replaces a bare-surname English greeting when the raw source detected Ms Parker", async () => {
    const fallbackDraft = [
      "Thank you for getting in touch about this.",
      "I will review what happened and follow up with the next steps.",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackDraft))
    const payload = {
      situation: englishGreetingSituation,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      greeting: {
        text: "Hello Parker,",
        confidence: "HIGH",
        source: "resolved-name",
        name: "Ms Parker",
      },
      situationRaw: "Sharing a follow-up.\nKind regards\nMs Parker\n",
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
    expect(json.data?.greeting?.text).toBe("Dear Ms Parker,")
    expect(generatedDraft).toContain("\n\nDear Ms Parker,\n\n")
    expect(generatedDraft).not.toContain("Hello Parker")
  })

  it("repairs the malformed unknown-recipient fallback path that previously surfaced as Hello comma I", async () => {
    const fallbackDraft = [
      "Subject: Update on homework",
      "Hello , I wanted to send a clear update about homework.",
      "I will go through what is missing in class and make the next step clear.",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n\n")
    fallbackGenerator.mockResolvedValueOnce(buildFallbackResult(fallbackDraft))
    const payload = {
      situation:
        "Need to send a calm parent update about repeated late homework this week and explain the check-in I will do tomorrow morning in school.",
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      situationRaw:
        "Repeated late homework this week. Need to send a calm parent update and explain the check-in I will do tomorrow.",
      signature: {
        line1: "Dr Greg Blackburn",
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
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(json.data?.greeting?.text).toBe("Dear Parent/Carer,")
    expect(generatedDraft).toContain("\n\nDear Parent/Carer,\n\n")
    expect(generatedDraft).not.toContain("Hello , I")
    expect(generatedDraft).toContain("I wanted to send a clear update about homework.")
  })

  it.each([
    {
      name: "Lucy possessive dad sign-off",
      situation: lucyParentEmail,
      badGreeting: "Hello Lucy's,",
      blocked: [/^Subject:\s+[^\n]+\n\nHello Lucy's,/i, /^Subject:\s+[^\n]+\n\nHello Lucy,/i],
      expectedDirection: "parent_to_teacher",
    },
    {
      name: "Tom possessive mum sign-off",
      situation: [
        "Subject: Concern about how Tom was spoken to in class",
        "",
        "Hello,",
        "",
        "Tom was upset after the lesson and I would appreciate a calm response.",
        "",
        "Kind regards,",
        "Tom's Mum",
      ].join("\n"),
      badGreeting: "Hello Tom's,",
      blocked: [/^Subject:\s+[^\n]+\n\nHello Tom's,/i, /^Subject:\s+[^\n]+\n\nHello Tom,/i],
      expectedDirection: "parent_to_teacher",
    },
    {
      name: "no parent name supplied",
      situation: [
        "Subject: Follow-up on the lesson today",
        "",
        "Hello,",
        "",
        "Lucy was upset after the lesson and I would appreciate a response.",
        "",
        "Kind regards,",
      ].join("\n"),
      badGreeting: "Hello Lucy,",
      blocked: [/^Subject:\s+[^\n]+\n\nHello Lucy,/i],
    },
    {
      name: "child mentioned repeatedly without a parent sign-off",
      situation: [
        "Subject: Concern about the lesson",
        "",
        "Hello,",
        "",
        "Lucy felt upset after the lesson. Lucy felt embarrassed in front of the class. Lucy found it difficult to regulate afterwards.",
        "",
        "Kind regards,",
      ].join("\n"),
      badGreeting: "Hello Lucy,",
      blocked: [/^Subject:\s+[^\n]+\n\nHello Lucy,/i],
    },
  ])("uses a neutral greeting fallback for $name", async ({ situation, badGreeting, blocked, expectedDirection }) => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Follow-up on today's concern",
          badGreeting,
          "Thank you for your message.",
          "I will review what happened and follow up with the next steps.",
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
        situation,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    const providerCall = fallbackGenerator.mock.calls[0]?.[0]

    if (expectedDirection) {
      expect(providerCall?.generationMetadata.direction).toBe(expectedDirection)
    }
    expect(json.data?.greeting?.text).toBe("Dear Parent/Carer,")
    expect(generatedDraft).toContain("\n\nDear Parent/Carer,\n\n")
    blocked.forEach((pattern) => {
      expect(generatedDraft).not.toMatch(pattern)
    })
  })

  it("retries a pasted Lucy parent email when the draft parrots the complaint back", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Follow-up on today's concern",
            "Hello Lucy's,",
            "Lucy felt upset after the lesson, she felt embarrassed by how it was handled, and I understand that the phone is used for mindfulness purposes.",
            "I will think about this again.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Follow-up on classroom expectations",
            "Hello,",
            "Thank you for getting in touch and for explaining your concerns.",
            "I'm sorry to hear that Lucy felt upset after the lesson. My intention was not to embarrass her, but to apply the usual classroom expectation around phone use consistently.",
            "I understand that Lucy may need support when she feels overwhelmed. I will follow this up with the appropriate colleague so that any agreed adjustments are clear and consistent for Lucy and for staff.",
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
        situation: lucyParentEmail,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(fallbackGenerator.mock.calls[0]?.[0]?.generationMetadata.direction).toBe("parent_to_teacher")
    expect(generatedDraft).toContain("\n\nDear Parent/Carer,\n\n")
    expect(generatedDraft).toContain("Thank you for getting in touch and for explaining your concerns.")
    expect(generatedDraft).toContain("apply the usual classroom expectation around phone use consistently")
    expect(generatedDraft).toContain("follow this up with the appropriate colleague")
    expect(generatedDraft).not.toContain("mindfulness purposes")
    expect(generatedDraft).not.toContain("I don't have a record")
    expect(generatedDraft).not.toContain("Hello Lucy's,")
    expect(generatedDraft).not.toContain("Hello Lucy,")
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

  it("treats pasted parent email as a parent message when inputIntent is parent_message and generates a teacher reply", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Lucy's phone use in class",
          "",
          "Dear Parent/Carer,",
          "",
          "Thank you for your email. My intention was to keep the classroom expectation clear while supporting Lucy calmly.",
          "",
          "I will follow this up sensitively and make sure the next step is clear.",
          "",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n"),
      ),
    )

    const payload = {
      situation: lucyParentEmail,
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      inputIntent: "parent_message",
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
    const providerInput = fallbackGenerator.mock.calls[fallbackGenerator.mock.calls.length - 1]?.[0]
    expect(providerInput?.generationMetadata.direction).toBe("parent_to_teacher")
    expect(providerInput?.lightEditMode).toBe(false)
    expect(json.data?.generatedDraft).toContain("Thank you for your email.")
    expect(json.data?.generatedDraft).toContain("My intention was to keep the classroom expectation clear")
  })

  it("honors explicit draft selection even when the text looks like an incoming parent email", async () => {
    const payload = {
      situation: [
        "Subject: Concern about Lucy",
        "",
        "Hello,",
        "",
        "My child came home upset and I would appreciate an explanation.",
        "",
        "Kind regards,",
        "Lucy's Dad",
      ].join("\n"),
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      inputIntent: "teacher_draft",
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
    expect(providerInput?.generationMetadata.direction).toBe("teacher_to_parent")
    expect(providerInput?.lightEditMode).toBe(true)
  })

  it("falls back to classifier routing when inputIntent is missing", async () => {
    const payload = {
      situation: [
        "Subject: Update on Lucy",
        "",
        "Dear Mr Evans,",
        "",
        "I wanted to let you know Lucy settled well after our conversation today.",
        "",
        "Kind regards,",
        "Dr Greg Blackburn",
      ].join("\n"),
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
    expect(providerInput?.generationMetadata.direction).toBe("teacher_to_parent")
  })

  it("falls back to the legacy parent-message input field when inputIntent is missing", async () => {
    const payload = {
      situation: [
        "Subject: Concern about Lucy",
        "",
        "Hello,",
        "",
        "My child came home upset and I would appreciate an explanation.",
        "",
        "Kind regards,",
        "Lucy's Dad",
      ].join("\n"),
      tone: "professional",
      language: "en",
      uiLocale: "en-GB",
      mode: "parent_message",
      parentMessageInputType: "teacher_draft",
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
    expect(providerInput?.generationMetadata.direction).toBe("teacher_to_parent")
    expect(providerInput?.lightEditMode).toBe(true)
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

describe("/api/draft/generate light edit mode", () => {
  it("preserves a strong teacher-authored Lucy reply instead of expanding it into a fuller rewrite", async () => {
    const strongLucyReply = [
      "Subject: Follow-up on Lucy's phone use",
      "",
      "Dear Mr Evans,",
      "",
      "Thank you for your email. My intention was to keep the phone expectation clear in class, not to make Lucy uncomfortable.",
      "",
      "Lucy may need support at times, and I will speak with her tomorrow. The expectation remains that phones stay away during lessons.",
      "",
      "Kind regards,",
      "Dr Greg Blackburn",
    ].join("\n")

    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Classroom support for Lucy",
          "",
          "Dear Parent/Carer,",
          "",
          "Thank you for taking the time to share your concerns regarding Lucy's wellbeing in today's lesson.",
          "",
          "I appreciate this feedback and want to reassure you that my intention was to support Lucy appropriately within the classroom environment.",
          "",
          "I will liaise with the support coordinator and the relevant pastoral colleagues so that we can clarify the most appropriate process moving forward.",
          "",
          "Would it be helpful to arrange a brief meeting next week to discuss how we can best support Lucy together?",
          "",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: strongLucyReply,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        inputIntent: "teacher_draft",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    const providerInput = fallbackGenerator.mock.calls[0]?.[0]

    expect(providerInput?.generationMetadata.direction).toBe("teacher_to_parent")
    expect(providerInput?.lightEditMode).toBe(true)
    expect(getWordSequenceSimilarity(strongLucyReply, generatedDraft)).toBeGreaterThanOrEqual(0.8)
    expect(countNormalizedWords(generatedDraft)).toBeLessThanOrEqual(
      Math.ceil(countNormalizedWords(strongLucyReply) * 1.1),
    )
    expect(json.data?.teacherDraftFeedback).toEqual({
      level: "already_strong",
      reasons: ["preserved_tone", "maintained_boundaries", "risk_checked"],
    })
    expect(generatedDraft).not.toContain("support coordinator")
    expect(generatedDraft).not.toContain("pastoral")
    expect(generatedDraft).not.toContain("Would it be helpful to arrange a brief meeting")
    expect(generatedDraft).toContain("The expectation remains that phones stay away during lessons.")
  })

  it("keeps a strong pasted teacher draft substantially intact under teacher_draft inputIntent", async () => {
    const teacherDraft = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch and for sharing your concerns.",
      "",
      "I'm sorry to hear that Lucy felt uncomfortable after the lesson. My intention was not to embarrass her, but to apply the usual classroom expectation around phone use consistently.",
      "",
      "I understand that Lucy may need support when she feels overwhelmed. It would be helpful to clarify this through the school's usual support process so that any agreed adjustments are clear for Lucy and for staff.",
      "",
      "In the meantime, I'll continue to handle this sensitively in class and will follow up with the appropriate colleague so we can support Lucy well.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Dear Parent/Carer,",
          "",
          "Thank you for getting in touch and for sharing your concerns.",
          "",
          "I'm sorry to hear that Lucy felt uncomfortable after yesterday's lesson. My intention was not to embarrass her, but to apply the usual classroom expectation around phone use consistently.",
          "",
          "I understand that Lucy may need support when she feels overwhelmed. I will liaise with the support coordinator so that any agreed adjustments are clear for Lucy and for staff.",
          "",
          "In the meantime, I'll continue to handle this sensitively in class and will follow up with the appropriate colleague so we can support Lucy well.",
          "",
          "Kind regards,",
          "Greg",
        ].join("\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: teacherDraft,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        inputIntent: "teacher_draft",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    const providerInput = fallbackGenerator.mock.calls[fallbackGenerator.mock.calls.length - 1]?.[0]

    expect(providerInput?.generationMetadata.direction).toBe("teacher_to_parent")
    expect(providerInput?.lightEditMode).toBe(true)
    expect(getWordSequenceSimilarity(teacherDraft, generatedDraft)).toBeGreaterThanOrEqual(0.8)
    expect(countNormalizedWords(generatedDraft)).toBeLessThanOrEqual(
      Math.ceil(countNormalizedWords(teacherDraft) * 1.15),
    )
    expect(json.data?.teacherDraftFeedback).toEqual({
      level: "already_strong",
      reasons: ["preserved_tone", "maintained_boundaries", "risk_checked"],
    })
    expect(generatedDraft).not.toContain("support coordinator")
    expect(generatedDraft).not.toContain("yesterday's lesson")
    expect(generatedDraft).not.toContain("next week")
    expect(generatedDraft).toContain("My intention was not to embarrass her")
    expect(generatedDraft).toContain("the usual classroom expectation around phone use consistently")
    expect(generatedDraft).toContain("follow up with the appropriate colleague")
  })

  it("preserves the teacher's existing sign-off in My draft mode when no explicit profile signature was supplied", async () => {
    const teacherDraft = [
      "Dear Parent/Carer,",
      "",
      "Thank you for getting in touch and for sharing your concerns.",
      "",
      "I'm sorry to hear that Lucy felt uncomfortable after the lesson.",
      "",
      "Kind regards,",
      "Greg",
    ].join("\n")

    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Dear Parent/Carer,",
          "",
          "Thank you for getting in touch and for sharing your concerns.",
          "",
          "I'm sorry to hear that Lucy felt uncomfortable after the lesson.",
          "",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n"),
      ),
    )

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: teacherDraft,
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        inputIntent: "teacher_draft",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.data.generatedDraft).toContain("Kind regards,\nGreg")
    expect(json.data.generatedDraft).not.toContain("Kind regards,\nDr Greg Blackburn")
  })
})

describe("/api/draft/generate closing normalization", () => {
  it.each(["warm", "professional", "direct", "empathetic"] as const)(
    "keeps the canonical signoff visible for the Sally safe draft in %s tone",
    async (tone) => {
      fallbackGenerator.mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Update on Sally's homework",
            "Hello Karen,",
            "I wanted to let you know that Sally has been finding it difficult to hand in homework on time and this is beginning to become a pattern.",
            "I will go through the missing work with Sally tomorrow and make the next steps clear.",
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
            "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
          tone,
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
      expect(generatedDraft).toContain("Kind regards,\nDr Greg Blackburn")
      expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
      expect(json.data?.formattedDraft?.paragraphs.at(-1)).toBe("Kind regards,\nDr Greg Blackburn")
    },
  )

  it("restores the signoff for the Sally safe draft professional case when the returned body omits it", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Update on Sally's homework",
          "Hello Karen,",
          "I wanted to let you know that Sally has been struggling to hand in homework on time and this is becoming a pattern.",
          "I will check the missing tasks with Sally tomorrow and make the next step clear.",
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
          "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
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
    expect(generatedDraft.trim().endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect(json.data?.formattedDraft?.paragraphs.at(-1)).toBe("Kind regards,\nDr Greg Blackburn")
  })

  it("appends a canonical signoff block to a safe draft teacher-note parent message", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Update on punctuality",
          "Hello Karen,",
          "I wanted to send a brief update about lateness to class and the support I will put in place tomorrow morning.",
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
          "Need a calm message to Karen about repeated lateness this week, the disruption to the start of lessons, and the check-in I will do tomorrow morning.",
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
    expect(generatedDraft.trim().endsWith("Kind regards,\nDr Greg Blackburn")).toBe(true)
    expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
  })

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

  it("avoids duplicate sign-off blocks when the model already includes the teacher profile name", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Homework update",
          "Dear Parent/Carer,",
          "I wanted to give you a clear update about the homework concern and the support I will put in place tomorrow.",
          "Kind regards,\nDr Greg Blackburn",
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
          "Need to send a calm parent update about homework, explain the support I will put in place tomorrow, clarify the next steps, and keep the tone clear and steady for the family.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
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

  it("keeps the signoff visible for the Karen/Jake angry-parent panic scan case", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Follow-up on Jake's day",
          "Dear Karen,",
          "I am sorry to hear that Jake was so upset after school today.",
          "I will speak with the staff involved, review what happened at lunchtime, and come back to you with an update as soon as I can.",
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
          "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime. I want to know what happened and why nobody called me.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "scan-456",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).toContain("Kind regards,\nDr Greg Blackburn")
    expect(json.data?.formattedDraft?.paragraphs.at(-1)).toBe("Kind regards,\nDr Greg Blackburn")
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

  it("restores the canonical signoff after recovery paths that return body-only text", async () => {
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
          "Need to reply to a parent about a bullying concern at breaktime, explain that I will check what happened today, and follow up with a clear update once I have spoken to staff.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""
    expect(generatedDraft).toContain("Kind regards,\nDr Greg Blackburn")
    expect((generatedDraft.match(/Kind regards,/gi) ?? []).length).toBe(1)
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

  it("does not append the authenticated teacher sign-off in report comment mode", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        "The student has shown more consistent focus this week and completes follow-up tasks with less prompting.",
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
          "Write a report comment about the student's calmer participation, better focus, stronger follow-through during classwork, and the more consistent independence shown across lessons this week.",
        tone: "professional",
        language: "en",
        mode: "report_comment",
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

  it("keeps Jane report comments free of any parent-email signoff", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        "Jane has made steady progress in reading this term and contributes thoughtfully in class discussions.",
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
          "Write a concise report comment about Jane's strong reading progress, thoughtful class contributions, and the next small target for written accuracy.",
        tone: "professional",
        language: "en",
        mode: "report_comment",
        studentFirstName: "Jane",
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
    expect(generatedDraft).toContain("Dear Parent/Carer,")
    expect(generatedDraft).toContain("I wanted to send a brief update")
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
    expect(generatedDraft).toContain("I wanted to send a brief update")
    expect(generatedDraft).toContain("I will go through what is missing in class")
    expect(generatedDraft).not.toContain("your child came home so upset")
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
    expect(generatedDraft).toContain("I wanted to send a brief update")
    expect(json.data?.formattedDraft?.paragraphs.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("keeps safe draft teacher notes on a teacher-note recovery path after a greeting-only collapse", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(buildFallbackResult("Hello Parent,"))
      .mockResolvedValueOnce(buildFallbackResult("Hello Parent,"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Hello Parent, late again this week, disrupted the start of the lesson, and homework still not done. Need a calm message with clear next steps from school.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(generatedDraft).toContain("Subject:")
    expect(generatedDraft).toContain("recent concerns with punctuality, classroom behaviour, and homework")
    expect(generatedDraft).toContain("expectations around arriving on time")
    expect(generatedDraft).toContain("classroom expectations")
    expect(generatedDraft).toContain("missing homework")
    expect(generatedDraft).not.toContain("Thank you for bringing this to my attention")
    expect(generatedDraft).not.toContain("your child came home")
  })

  it("never returns 'the student' in parent message mode", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Update from today's lesson",
          "Hello Jordan,",
          "The student found the learning tasks difficult during instruction time, but the student stayed engaged and completed the work with support.",
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
          "Write a calm parent update about Luca needing more support with independent maths work today, including that he stayed engaged, responded to support, and will revisit the same work in tomorrow's lesson.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        studentFirstName: "Luca",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(generatedDraft).not.toContain("the student")
    expect(generatedDraft).toContain("Luca")
    expect(generatedDraft).not.toContain("instruction time")
    expect(generatedDraft).not.toContain("learning tasks")
    expect(generatedDraft).toContain("during class")
    expect(json.data?.outputSafetyAnalysis?.riskLevel).toBe("low")
  })

  it("retries risky parent output and returns the post-rewrite safety assessment", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Behaviour concern",
          "Hello Jordan,",
          "The student refuses to listen and if this continues we will have to involve the head teacher.",
          "Kind regards,",
          "Dr Greg Blackburn",
        ].join("\n\n"),
      ),
    )
    mockedGenerateDraft.mockResolvedValueOnce({
      text: [
        "Subject: Update from today",
        "Hello Jordan,",
        "I wanted to let you know that Luca found it difficult to follow instructions during class today, so I will revisit the expectations with him tomorrow and follow up with you if needed.",
        "Kind regards,",
        "Dr Greg Blackburn",
      ].join("\n\n"),
      providerMeta: {
        modelUsed: "test-model",
        latencyMs: 10,
      },
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Write a parent email about Luca finding it difficult to follow instructions in class today, explain the support given, and include a clear follow-up step for tomorrow so the message stays calm and factual.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        studentFirstName: "Luca",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()

    expect(mockedGenerateDraft).toHaveBeenCalledTimes(1)
    expect(json.data?.generatedDraft).toContain("Luca found it difficult to follow instructions during class today")
    expect(json.data?.outputSafetyAnalysis?.riskLevel).toBe("low")
    expect(json.data?.outputSafetyAnalysis?.triggeredSignals ?? []).toHaveLength(0)
  })

  it("keeps 'The student' available in documentation mode", async () => {
    mockedGenerateDraft.mockResolvedValueOnce({
      text: [
        "Incident Record",
        "",
        "Date: 2026-03-15",
        "Location: Classroom",
        "Observed behaviour: The student shouted across the room during the lesson.",
        "Teacher response: The teacher recorded the incident and asked the student to pause.",
        "Follow-up action: Further review is required.",
        "",
        "This record is for documentation purposes.",
      ].join("\n"),
      providerMeta: {
        modelUsed: "test-model",
        latencyMs: 10,
      },
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Document that Luca shouted across the room during the lesson, needed a calm follow-up from staff, and required the incident to be recorded clearly for later review.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        documentationMode: true,
        studentFirstName: "Luca",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.data?.documentationModeActive).toBe(true)
    expect(json.data?.generatedDraft).toContain("The student")
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

  it("falls back to teacher-note recovery when retries keep parent-reply complaint wording on safe draft notes", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Hello,",
            "I'm sorry to hear that your child came home so upset today.",
            "Thank you for bringing this to my attention.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Hello,",
            "I'm sorry to hear that your child came home so upset today.",
            "Thank you for bringing this to my attention.",
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
          "Need a calm parent update about missing homework, lateness to class, and the conversation I will have tomorrow morning so the expectations are clear.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(json.data.generatedDraft).toContain("Subject:")
    expect(json.data.generatedDraft).toContain("recent concerns with punctuality, classroom behaviour, and homework")
    expect(json.data.generatedDraft).toContain("classroom expectations")
    expect(json.data.generatedDraft).toContain("missing homework")
    expect(json.data.generatedDraft).not.toContain("Thank you for bringing this to my attention")
    expect(json.data.generatedDraft).not.toContain("your child came home so upset")
    expect(json.data.meta.recovery.finalSource).toBe("deterministic_fallback")
    expect(json.data.meta.recovery.triggerReasons).toContain("TEACHER_STYLE_FALLBACK")
  })

  it("forces a source-grounded recovery when a generic panic scan reply slips through", async () => {
    fallbackGenerator.mockResolvedValueOnce(
      buildFallbackResult(
        [
          "Subject: Update from school",
          "Hello,",
          "Thank you for your message.",
          "I will follow this up in school and keep the next steps clear and practical.",
          "If a further update would be helpful once I have followed this up, I will come back to you.",
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
          "Parent says their child was pushed at breaktime, felt unsafe in the playground after lunch, came home very distressed, and wants a response today.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.generatedDraft).toContain("Subject: Follow-up on today's concern")
    expect(json.data.generatedDraft).toContain("what happened today")
    expect(json.data.generatedDraft).not.toContain(
      "I will follow this up in school and keep the next steps clear and practical.",
    )
    expect(json.data.meta.recovery.finalSource).toBe("deterministic_fallback")
    expect(json.data.meta.recovery.triggerReasons).toContain("GENERIC_RECOVERY_OVERUSE")
    expect(json.data.meta.recovery.templateFamily).toBe("source_grounded_bullying_safety")
  })

  it("retries panic scan replies that parrot the parent's incident report back to them", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Follow-up on today's concern",
            "Hello Karen,",
            "I understand he came home upset after being pushed by another student.",
            "I wanted to update you regarding the incident Jake experienced in class.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Follow-up on today's concern",
            "Hello Karen,",
            "Thank you for getting in touch about this.",
            "I will speak with the staff involved and check what happened at lunchtime today.",
            "I will come back to you once I have reviewed this properly.",
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
          "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime. Karen wants to know what happened and why nobody called.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "scan-789",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(json.data.generatedDraft).toContain("Thank you for getting in touch about this.")
    expect(json.data.generatedDraft).not.toContain("I understand he came home upset")
    expect(json.data.generatedDraft).not.toContain("I wanted to update you regarding the incident")
  })

  it("retries high-risk panic scan replies that use generic or condescending safety language", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Follow-up on today's concern",
            "Hello Karen,",
            "I know this will feel serious.",
            "I wanted to follow up on what happened today.",
            "I will look into this.",
            "Please don't hesitate to reach out.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Follow-up on today's concern",
            "Hello Karen,",
            "I'm really sorry to hear Jake had such a difficult experience today. I completely understand why this is worrying.",
            "I did not personally witness this during class, but I take what you have shared very seriously.",
            "I will speak with Jake privately tomorrow morning, speak with the other students involved, and check with the staff who were on duty at lunchtime.",
            "Would you be available for a short phone call tomorrow afternoon, or would you prefer to meet in person?",
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
          "Jake came home angry and upset saying nobody listened when another child pushed him at lunchtime at school. Karen wants to know what happened in class and why nobody called.",
        tone: "empathetic",
        language: "en",
        mode: "parent_message",
        inputMode: "panic_scan",
        sourceType: "ocr_text",
        messageType: "parent_complaint",
        scanId: "scan-790",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(json.data.generatedDraft).toContain("I'm really sorry to hear Jake had such a difficult experience today.")
    expect(json.data.generatedDraft).toContain("I will speak with Jake privately tomorrow morning")
    expect(json.data.generatedDraft).toContain("Would you be available for a short phone call tomorrow afternoon")
    expect(json.data.generatedDraft).not.toContain("I know this will feel serious")
    expect(json.data.generatedDraft).not.toContain("I wanted to follow up on what happened today")
    expect(json.data.generatedDraft).not.toContain("Please don't hesitate to reach out")
  })

  it("preserves the selected tone through teacher-authenticity retry attempts", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Hello,",
            "Thank you for sharing your concerns about homework.",
            "I will gather the details and prepare a practical plan.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Hello,",
            "Sally has been handing homework in late, and it is becoming a pattern.",
            "I will go through what is missing tomorrow, make the next deadline clear, and expect the work to be handed in on time from this point.",
            "I wanted to raise this now so it can be addressed before it becomes a wider pattern.",
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
          "Sally has been struggling to hand in homework on time and it is becoming a pattern. I need to let the parents know but I don't want to sound harsh.",
        tone: "direct",
        language: "en",
        mode: "parent_message",
        studentFirstName: "Sally",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(fallbackGenerator.mock.calls[0]?.[0]?.tone).toBe("direct")
    expect(fallbackGenerator.mock.calls[1]?.[0]?.tone).toBe("direct")

    const json = await response.json()
    expect(json.data?.generatedDraft).toContain(
      "Sally has been handing homework in late, and it is becoming a pattern.",
    )
    expect(json.data?.generatedDraft).not.toContain("I'm sorry to hear your child came home upset")
  })

  it("preserves Sally and the full concern cluster when safe draft teacher notes fall back", async () => {
    fallbackGenerator
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Dear Parent/Carer,",
            "I wanted to let you know that homework has been handed in late more regularly over the past few weeks.",
            "I will go through what is missing in class, make the next task and deadline clear, and check that the expectations are understood.",
            "Kind regards,",
            "Dr Greg Blackburn",
          ].join("\n\n"),
        ),
      )
      .mockResolvedValueOnce(
        buildFallbackResult(
          [
            "Subject: Homework update",
            "Dear Parent/Carer,",
            "I wanted to let you know that homework has been handed in late more regularly over the past few weeks.",
            "I will go through what is missing in class, make the next task and deadline clear, and check that the expectations are understood.",
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
          "Sally has been late to registration twice this week, has called out during lessons, and still has missing homework. I need to send a calm message home without sounding harsh.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        studentFirstName: "Sally",
        signature: {
          line1: "Dr Greg Blackburn",
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(fallbackGenerator).toHaveBeenCalledTimes(2)
    expect(fallbackGenerator.mock.calls[0]?.[1]?.teacherNoteIssueClusters).toEqual([
      "attendance_lateness",
      "classroom_behaviour",
      "homework",
    ])

    const json = await response.json()
    expect(json.data?.generatedDraft).toContain("Sally")
    expect(json.data?.generatedDraft).toContain("punctuality")
    expect(json.data?.generatedDraft).toContain("classroom expectations")
    expect(json.data?.generatedDraft).toContain("missing homework")
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
      expectedMessage:
        "You have used all 5 free drafts for this month. Upgrade to unlock Draft Pro for unlimited generations.",
    },
    {
      language: "de",
      uiLocale: "de-DE",
      expectedMessage:
        "Du hast alle 5 Gratis-Entwürfe in diesem Monat verbraucht. Upgrade auf Draft Pro für unbegrenzte Entwürfe.",
    },
  ]

  limitCases.forEach((testCase) => {
    it(`returns a localized usage limit error for ${testCase.language}`, async () => {
      mockedGetUserEntitlements.mockResolvedValueOnce({
        plan: "free",
        usage: {
          plan: "free",
          currentMonthUsage: 11,
          limit: MOCK_FREE_TIER_LIMIT,
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
          limit: MOCK_FREE_TIER_LIMIT,
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
          limit: MOCK_FREE_TIER_LIMIT,
          remaining: MOCK_FREE_TIER_LIMIT,
          unlimited: false,
        },
        usageRecord: {
          month: "2025-01",
          generationCount: MOCK_FREE_TIER_LIMIT,
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
      expect(json.data?.usage?.remaining).toBe(4)
      expect(mockedIncrementUsage).toHaveBeenCalled()
    })
  })
})

describe("/api/draft/generate documentation mode", () => {
  it("falls back to a documentation record when documentation-mode generation throws", async () => {
    mockedGenerateDraft.mockRejectedValueOnce(new Error("Missing AI provider key (OPENAI_API_KEY)"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Your child refuses to listen and constantly disrupts the class. I've told you this before. If this continues we will have to involve the head teacher.",
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        documentationMode: true,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data?.documentationModeActive).toBe(true)
    expect(json.data?.generatedDraft).toContain("Incident Record")
    expect(json.data?.generatedDraft).toContain("Date:")
    expect(json.data?.generatedDraft).toContain("Location: Not specified")
    expect(json.data?.generatedDraft).toContain("Observed behaviour:")
    expect(json.data?.generatedDraft).toContain("Teacher response:")
    expect(json.data?.generatedDraft).toContain("Follow-up action:")
    expect(json.data?.generatedDraft).toContain("Observed behaviour: The student refuses to listen and constantly disrupts the class.")
    expect(json.data?.generatedDraft).toContain("Teacher response: The teacher recorded that this had been raised previously.")
    expect(json.data?.generatedDraft).toContain("Follow-up action: Further school follow-up may be required if the pattern continues.")
    expect(json.data?.generatedDraft).toContain("This record is for documentation purposes.")
  })

  it("sanitizes professional-risk phrasing in documentation fallback output", async () => {
    mockedGenerateDraft.mockRejectedValueOnce(new Error("Missing AI provider key (OPENAI_API_KEY)"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "I think he might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
        tone: "professional",
        language: "en",
        uiLocale: "en-GB",
        mode: "parent_message",
        documentationMode: true,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    const generatedDraft = json.data?.generatedDraft ?? ""

    expect(json.data?.documentationModeActive).toBe(true)
    expect(generatedDraft).toContain("Incident Record")
    expect(generatedDraft).toContain("Location: Not specified")
    expect(generatedDraft).toMatch(/Date: \d{4}-\d{2}-\d{2}/)
    expect(generatedDraft).not.toContain("[REDACTED PHONE]")
    expect(generatedDraft).toContain("assessment for learning and attention needs")
    expect(generatedDraft).not.toContain("I think he might have may benefit")
    expect(generatedDraft).not.toContain("ADHD")
    expect(generatedDraft).not.toContain("deliberately")
    expect(generatedDraft).not.toContain("emotional problems")
    expect(generatedDraft).toContain("This record is for documentation purposes.")
  })
})

describe("/api/draft/generate resilience", () => {
  it("keeps parent-message generation working when the safety engine fails", async () => {
    mockedRunSafetyEngine.mockImplementationOnce(async () => {
      throw new Error("Anthropic tone classification failed: 400 Bad Request")
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: detailedSituation,
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data?.generatedDraft).toContain("Lukas hat beschrieben")
  })

  it("keeps documentation mode generation working when profile and signature data are missing", async () => {
    mockedAuthorizeFirebaseRequest.mockResolvedValueOnce({
      uid: "test-uid",
      decodedToken: {
        name: null,
      },
      firestore: createFirestoreStub(),
    })
    mockedRunSafetyEngine.mockResolvedValueOnce({
      riskScore: 82,
      riskLevel: "high",
      triggeredSignals: [],
      toneClass: "accusatory",
      topicSensitivity: "high",
      reactionForecast: {
        collaborative: 10,
        concerned: 15,
        defensive: 45,
        hostile: 20,
        confused: 10,
      },
      explanationLines: [],
      documentationModeAvailable: true,
      professionalRiskFlags: [],
      structuralImbalance: false,
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "Your child refuses to listen and constantly disrupts the class. I've told you this before. If this continues we will have to involve the head teacher.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
        documentationMode: true,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data?.documentationModeActive).toBe(true)
    expect(json.data?.generatedDraft).toContain("Incident Record")
  })

  it("returns a safe backend message for unexpected route failures", async () => {
    mockedIncrementUsage.mockRejectedValueOnce(new Error("firestore write failed"))

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation: detailedSituation,
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.success).toBe(false)
    expect(json.error?.code).toBe("AI_GENERATION_FAILED")
    expect(json.error?.message).toBe(
      "Draft generation is temporarily unavailable. Please try again in a few seconds.",
    )
  })
})

describe("/api/draft/generate professional risk handling", () => {
  it("pauses ADHD speculation with a teacher-protective coaching response", async () => {
    mockedDetectBlockedLanguage.mockReturnValueOnce({
      detected: true,
      tier: "tier2",
      matches: ["ADHD"],
      redactedPreview: "I think he may have [REDACTED TERM]",
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "I think he may have ADHD because he loses focus during longer tasks, misses steps, and struggles to stay with the class for the full lesson.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(422)

    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.data?.generatedDraft).toBeUndefined()
    expect(json.data?.blockedLanguage?.title).toBe("Draft paused this message for safety")
    expect(json.data?.blockedLanguage?.message).toBe(
      "Draft paused this message to keep the communication parent-safe.",
    )
    expect(json.data?.blockedLanguage?.teacherNote).toContain(
      "medical or diagnostic speculation",
    )
    expect(json.data?.blockedLanguage?.safeAlternatives).toContain(
      "Unsafe: 'I think he may have ADHD.'",
    )
    expect(json.data?.blockedLanguage?.safeAlternatives).toContain(
      "Use observation-based wording instead.",
    )
  })

  it("pauses autism-spectrum speculation with observation-based guidance", async () => {
    mockedDetectBlockedLanguage.mockReturnValueOnce({
      detected: true,
      tier: "tier2",
      matches: ["autism"],
      redactedPreview: "I wonder if he might be on the [REDACTED TERM] spectrum",
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "I wonder if he might be on the autism spectrum because he struggles to join in during group work, avoids noisy parts of the room, and becomes unsettled when routines change.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(422)

    const json = await response.json()
    expect(json.data?.blockedLanguage?.teacherNote).toContain(
      "describe observed behaviour and classroom impact only",
    )
    expect(json.data?.blockedLanguage?.safeAlternatives.join(" ")).not.toContain("autism")
  })

  it("still returns a draft when professional risk flags are present", async () => {
    mockedRunSafetyEngine.mockResolvedValueOnce({
      riskScore: 48,
      riskLevel: "medium",
      triggeredSignals: [],
      toneClass: "clinical",
      topicSensitivity: "high",
      reactionForecast: {
        collaborative: 20,
        concerned: 20,
        defensive: 40,
        hostile: 0,
        confused: 20,
      },
      explanationLines: [],
      documentationModeAvailable: false,
      professionalRiskFlags: [
        {
          signalId: "pro_medical_speculation",
          label: "Medical or diagnostic speculation",
          matchedPhrase: "I think he might have ADHD",
        },
        {
          signalId: "pro_motive_attribution",
          label: "Motive attribution",
          matchedPhrase: "He deliberately disrupts the class",
        },
        {
          signalId: "pro_psychological_interpretation",
          label: "Psychological interpretation",
          matchedPhrase: "seems to have emotional problems",
        },
      ],
      structuralImbalance: false,
    })

    const request = new Request("https://example.com/api/draft/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        situation:
          "I think he might have ADHD. He deliberately disrupts the class and seems to have emotional problems.",
        tone: "professional",
        language: "en",
        mode: "parent_message",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data.generatedDraft).toBeTruthy()
    expect(json.data.safetyAnalysis?.professionalRiskFlags).toHaveLength(3)
    expect(json.data.safetyAnalysis?.professionalRiskFlags[0]?.signalId).toBe(
      "pro_medical_speculation",
    )
  })
})
