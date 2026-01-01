import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import {
  detectSensitiveContent,
  detectBlockedLanguage,
  reframeBlockedLanguage,
  BlockedLanguageTier,
} from "@/lib/safety"
import { logServerEvent } from "@/lib/analytics"
import { buildUsageResponse, incrementUsage, MonthlyUsageRecord } from "@/lib/usage"
import { getUserEntitlements } from "@/lib/entitlements"
import type { DraftLanguage, DraftMode, PronounPreference } from "@/lib/types"
import { generateDraft, ProviderMeta, ProviderResult } from "@/lib/ai/provider"
import { enforcePronouns, inferPronounResolution } from "@/lib/text/pronouns"
import { enforceDraftRateLimit, RateLimitError } from "@/lib/rate-limit"
import { createHash } from "crypto"
import { FieldValue } from "firebase-admin/firestore"
import { resolveDraftMode } from "@/lib/draft-mode"
import {
  ALLOWED_LANGUAGES,
  ALLOWED_TONES,
  DraftFallbackContext,
  generateDraftWithFallback,
  LanguageKey,
  ProviderRequestInput,
  ToneKey,
} from "@/lib/draft/fallback"
import { isInternalQaUid, shouldRespectUsageLimit } from "@/lib/auth/internal-qa"
import { buildBlockedLanguageResponse } from "@/lib/draft/blocked-response"
import { enforceTeacherNameStyle } from "@/lib/draft/teacher-language"
import { formatDraftText, DraftStructure } from "@/lib/draft/format"
import { detectHighEmotionPhrases } from "@/lib/deescalation/detect"
import { rewriteHighEmotionText } from "@/lib/deescalation/rewrite"

const TONE_DESCRIPTIONS: Record<ToneKey, string> = {
  warm: "Warm & Encouraging",
  professional: "Professional & Neutral",
  direct: "Direct & Clear",
  empathetic: "Empathetic & Supportive",
}

const PRONOUN_PREFERENCE_VALUES: PronounPreference[] = ["auto", "she", "he", "they", "avoid"]

function parsePronounPreference(value: unknown): PronounPreference {
  if (typeof value === "string" && PRONOUN_PREFERENCE_VALUES.includes(value as PronounPreference)) {
    return value as PronounPreference
  }
  return "auto"
}

interface GenerateDraftRequest {
  situation: string
  tone: ToneKey
  language: string
  context?: {
    subject?: string
    gradeLevel?: string
  }
  rewrite?: boolean
  previousDraft?: string
  pronounPreference?: PronounPreference
  mode?: DraftMode
  studentFirstName?: string
  studentName?: string // deprecated - use studentFirstName
}

function buildContextLine(context?: GenerateDraftRequest["context"]) {
  const pieces: string[] = []

  if (context?.gradeLevel) {
    pieces.push(`Grade level: ${context.gradeLevel}`)
  }

  if (context?.subject) {
    pieces.push(`Subject focus: ${context.subject}`)
  }

  if (!pieces.length) {
    return ""
  }

  return pieces.join(" · ") + "."
}

function sanitizeLanguageChoice(input: string): LanguageKey | null {
  const normalized = input.trim().toLowerCase()
  if (normalized.startsWith("de")) {
    return "de"
  }
  if (normalized.startsWith("en")) {
    return "en"
  }
  return null
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

function buildUsageLimitError(usage: ReturnType<typeof buildUsageResponse>) {
  return {
    success: false,
    data: {
      usage,
    },
    error: {
      code: "USAGE_LIMIT_EXCEEDED",
      message: "You have reached your monthly draft limit. Upgrade to unlock Draft Pro for unlimited generations.",
    },
  }
}

async function reRunWithRewrite(
  payload: GenerateDraftRequest,
  previousDraft: string,
  resolvedPronounPreference: PronounPreference,
  mode: DraftMode,
): Promise<ProviderResult | null> {
  try {
    return await generateDraft({
      situation: payload.situation,
      tone: payload.tone,
      language: payload.language as DraftLanguage,
      context: payload.context,
      rewrite: true,
      previousDraft,
      pronounPreference: resolvedPronounPreference,
      mode,
    })
  } catch (error) {
    return null
  }
}

export async function POST(request: Request) {
  const requestedAt = new Date()
  const requestStart = Date.now()

  let payload: GenerateDraftRequest
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Payload must be JSON.",
        },
      },
      { status: 400 },
    )
  }

  const situation = typeof payload?.situation === "string" ? payload.situation.trim() : ""
  const promptTooLong = situation.length > 2000
  const tone = payload?.tone
  const language = typeof payload?.language === "string" ? sanitizeLanguageChoice(payload.language) : null
  const mode = resolveDraftMode(payload?.mode)

  const studentFirstNameInput =
    typeof payload?.studentFirstName === "string"
      ? payload.studentFirstName.trim()
      : typeof payload?.studentName === "string"
      ? payload.studentName.trim()
      : ""
  const studentNameForPayload = studentFirstNameInput || ""

  if (mode === null) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_MODE",
          message: "Please select a valid mode option.",
        },
      },
      { status: 400 },
    )
  }

  if (promptTooLong) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROMPT_TOO_LONG",
          message: "Please keep prompts under 2000 characters.",
        },
      },
      { status: 400 },
    )
  }

  if (!situation) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_INPUT",
          message: "Please describe the classroom situation before generating a draft.",
        },
      },
      { status: 400 },
    )
  }

  if (!tone || !ALLOWED_TONES.includes(tone)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_TONE",
          message: "Select one of the supported tone options.",
        },
      },
      { status: 400 },
    )
  }

  if (!language) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_LANGUAGE",
          message: "Language must be English or German (EN/DE).",
        },
      },
      { status: 400 },
    )
  }

  const pronounPreference = parsePronounPreference(payload?.pronounPreference)
  const pronounResolution = inferPronounResolution(
    pronounPreference,
    studentFirstNameInput || undefined,
    situation,
  )
  const resolvedPronounPreference = pronounResolution.resolvedPreference

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status },
    )
  }

  const { uid, firestore } = authContext
  const uidHash = createHash("sha256").update(uid).digest("hex").slice(0, 12)
  const logDraftOutcome = (
    outcomeCode: string,
    extras: { latencyMs?: number; modelUsed?: string; tokensUsed?: number; errorCode?: string } = {},
  ) => {
    console.info("[draft] generate outcome", {
      uidHash,
      tone,
      language,
      mode,
      outcome: outcomeCode,
      ...extras,
    })
  }
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Unable to access Firestore.",
        },
      },
      { status: 500 },
    )
  }
  const entitlements = await getUserEntitlements(uid, firestore)
  const { plan, usage } = entitlements
  const isQaUser = isInternalQaUid(uid)
  const enforceUsageLimits = shouldRespectUsageLimit(uid)

  const diagnosticsRef = firestore
    .collection("users")
    .doc(uid)
    .collection("diagnostics")
    .doc("status")
  const recordDiagnostic = async (fields: Record<string, unknown>) => {
    try {
      await diagnosticsRef.set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    } catch (error) {
      console.error("[draft] Failed to update diagnostics doc", error)
    }
  }

  if (enforceUsageLimits && plan === "free" && usage.remaining !== null && usage.remaining <= 0) {
    logServerEvent("draft_generation_denied_limit", { uid, plan })
    logDraftOutcome("RATE_LIMITED", { errorCode: "USAGE_LIMIT_EXCEEDED" })
    return NextResponse.json(buildUsageLimitError(usage), { status: 429 })
  }

  try {
    await enforceDraftRateLimit(uid, firestore)
  } catch (error) {
    if (error instanceof RateLimitError) {
      logServerEvent("draft_generation_rate_limited", { uid, plan })
      logDraftOutcome("RATE_LIMITED", { errorCode: "RATE_LIMITED" })
      void recordDiagnostic({ lastErrorCode: "RATE_LIMITED" })
      const waitSeconds = Math.ceil(error.retryAfterMs / 1000)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `You can generate a new draft in ${waitSeconds} seconds.`,
          },
        },
        { status: 429 },
      )
    }

    console.error("[draft] Rate limit transaction failed", error)
    throw error
  }

  const sanitizedContext = {
    subject: payload.context?.subject ? payload.context.subject.trim() : undefined,
    gradeLevel: payload.context?.gradeLevel ? payload.context.gradeLevel.trim() : undefined,
  }

  const snippetCollection = firestore.collection("users").doc(uid).collection("snippets")
  const snippetDoc = snippetCollection.doc()
  const requestId = snippetDoc.id

  const detection = detectSensitiveContent(situation)
  let sanitizedSituation = detection.sanitized
  const safetyFlags = new Set<string>()
  if (detection.matches.length > 0) {
    detection.matches.forEach((match) => safetyFlags.add(`input-${match.type}`))
    void recordDiagnostic({ lastErrorCode: "SENSITIVE_CONTENT" })
    return NextResponse.json(
      {
        success: false,
        data: {
          redactedPreview: detection.sanitized,
        },
        error: {
          code: "SENSITIVE_CONTENT",
          message:
            "Please remove emails, phone numbers, and addresses from the prompt before generating. The redacted preview can guide you.",
        },
      },
      { status: 422 },
    )
  }

  let currentSituation = sanitizedSituation
  let inputReframed = false
  let inputReframedTier: BlockedLanguageTier | null = null

  const sendBlockedLanguageError = (tier: BlockedLanguageTier) => {
    logServerEvent("draft_generation_blocked_language", { uid, plan, tier })
    logDraftOutcome("INVALID_REQUEST", { errorCode: "BLOCKED_LANGUAGE" })
    void recordDiagnostic({
      lastErrorCode: "BLOCKED_LANGUAGE",
      lastBlockedLanguageTier: tier,
    })
    const blockedResponse = buildBlockedLanguageResponse(tier)
    return NextResponse.json(
      {
        success: false,
        data: {
          blockedLanguage: blockedResponse,
        },
        error: {
          code: "BLOCKED_LANGUAGE",
          message: blockedResponse.message,
        },
      },
      { status: 422 },
    )
  }

  const blockedInput = detectBlockedLanguage(currentSituation)
  if (blockedInput.detected) {
    safetyFlags.add("input-blocked-language")
    if (blockedInput.tier === "tier3") {
      return sendBlockedLanguageError("tier3")
    }
    if (!blockedInput.tier) {
      return sendBlockedLanguageError("tier3")
    }

    const reframeResult = reframeBlockedLanguage(currentSituation, blockedInput.tier)
    if (!reframeResult.applied) {
      return sendBlockedLanguageError("tier3")
    }

    currentSituation = reframeResult.text
    inputReframed = true
    inputReframedTier = blockedInput.tier
    safetyFlags.add(`input-reframed-${inputReframedTier}`)

    const recheck = detectBlockedLanguage(currentSituation)
    if (recheck.detected) {
      return sendBlockedLanguageError("tier3")
    }
  }

  const preRewriteSituation = currentSituation
  const deescalationDetection = detectHighEmotionPhrases(preRewriteSituation)
  const deescalationRewrite = rewriteHighEmotionText(preRewriteSituation, deescalationDetection)
  currentSituation = deescalationRewrite.cleanedText
  const deescalationSummary = deescalationRewrite.summary
  const originalSituationForPrompt = preRewriteSituation

  const generationStart = Date.now()
  const providerInput: ProviderRequestInput = {
    situation: currentSituation,
    originalSituation: originalSituationForPrompt,
    tone,
    language: language as LanguageKey,
    context: sanitizedContext,
    rewrite: Boolean(payload.rewrite),
    previousDraft: payload.previousDraft,
    pronounPreference: resolvedPronounPreference,
    mode,
    studentFirstName: studentNameForPayload || undefined,
    resolvedPronounPreference,
  }
  const fallbackContext: DraftFallbackContext = {
    mode,
    tone,
    language: language as LanguageKey,
    requestId,
    uidHash,
    studentFirstName: studentNameForPayload || undefined,
    studentPronounPreference: resolvedPronounPreference,
  }
  const {
    result: providerResult,
    usedFallback,
    errorCode: fallbackErrorCode,
  } = await generateDraftWithFallback(providerInput, fallbackContext)
  let generatedDraft = enforcePronouns(providerResult.text, resolvedPronounPreference)
  generatedDraft = enforceTeacherNameStyle(generatedDraft, {
    firstName: studentNameForPayload || undefined,
    pronounPreference: resolvedPronounPreference,
    resolvedPronounPreference: resolvedPronounPreference,
  })
  let providerMeta = providerResult.providerMeta
  const formattedDraftStructure = formatDraftText(generatedDraft)
  let rewriteAttempted = false
  const generationTime = providerMeta.latencyMs ?? Date.now() - generationStart

  const outputDetection = detectSensitiveContent(generatedDraft)
  outputDetection.matches.forEach((match) => safetyFlags.add(`output-${match.type}`))
  if (outputDetection.matches.length > 0 && detection.matches.length === 0) {
    logDraftOutcome("INVALID_REQUEST", { errorCode: "INVALID_REQUEST" })
    void recordDiagnostic({ lastErrorCode: "INVALID_REQUEST" })
    return NextResponse.json(
      {
        success: false,
        data: {
          redactedPreview: outputDetection.sanitized,
        },
        error: {
          code: "INVALID_REQUEST",
          message: "Generated content included sensitive information that cannot be returned.",
        },
      },
      { status: 422 },
    )
  }
  let blockedDetection = detectBlockedLanguage(generatedDraft)
  const handleBlockedOutput = () => {
    safetyFlags.add("output-blocked-language")
    return sendBlockedLanguageError("tier3")
  }

  if (blockedDetection.detected) {
    if (blockedDetection.tier === "tier3") {
      return handleBlockedOutput()
    }

    if (!rewriteAttempted) {
      rewriteAttempted = true
      const rewriteResult = await reRunWithRewrite(payload, generatedDraft, resolvedPronounPreference, mode)
      if (rewriteResult) {
        generatedDraft = enforcePronouns(rewriteResult.text, resolvedPronounPreference)
        generatedDraft = enforceTeacherNameStyle(generatedDraft, {
          firstName: studentNameForPayload || undefined,
          pronounPreference: resolvedPronounPreference,
        })
        providerMeta = rewriteResult.providerMeta
        blockedDetection = detectBlockedLanguage(generatedDraft)
      }
    }
  }

  if (blockedDetection.detected) {
    return handleBlockedOutput()
  }

  let updatedUsage: MonthlyUsageRecord
  try {
    updatedUsage = await incrementUsage(uid, firestore, plan === "pro" || isQaUser)
  } catch (error) {
    if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
      return NextResponse.json(buildUsageLimitError(usage), { status: 429 })
    }
    console.error("[draft] Usage increment failed", error)
    throw error
  }

  const latencyMs = Date.now() - requestStart
  const safetyFlagList = safetyFlags.size ? Array.from(safetyFlags) : ["no-sensitive-content"]

  const metadata = {
    userId: uid,
    toneUsed: tone,
    language,
    modeUsed: mode,
    modelUsed: providerMeta.modelUsed,
    pronounPreference,
    pronounResolution: {
      resolvedPreference: resolvedPronounPreference,
      reason: pronounResolution.reason,
      source: pronounResolution.source ?? null,
    },
    tokensUsed: providerMeta.tokensUsed ?? null,
    generationTime,
    latencyMs,
    wordCount: countWords(generatedDraft),
    safetyFlags: safetyFlagList,
    generatedAt: new Date().toISOString(),
    requestedAt: requestedAt.toISOString(),
    contextUsed: sanitizedContext,
  }

  const responseMeta = {
    inputReframed,
    inputReframedTier,
    latencyMs,
    usedFallback,
    errorCode: fallbackErrorCode,
    requestId,
  }

  logServerEvent("draft_generation", {
    uid,
    plan,
    tone,
    language,
    mode,
    usedFallback,
    fallbackErrorCode,
    wordCount: metadata.wordCount,
    pronounPreference,
    resolvedPronounPreference,
    pronounResolutionReason: pronounResolution.reason,
    inputReframed,
    inputReframedTier,
  })

  let snippetId: string | null = null
  const usageAfterGeneration = buildUsageResponse(updatedUsage, plan)

  const snippetPayload = {
    generatedText: generatedDraft,
    tone,
    language,
    pronounPreference,
    pronounResolution: metadata.pronounResolution,
    contextUsed: sanitizedContext,
    mode,
    wordCount: metadata.wordCount,
    modelUsed: metadata.modelUsed,
    inputReframed,
    inputReframedTier,
    safetyFlags: metadata.safetyFlags,
    latencyMs,
    generationTime: metadata.generationTime,
    usage: usageAfterGeneration,
    createdAt: new Date().toISOString(),
    requestId: snippetDoc.id,
  }

  try {
    await snippetDoc.set(snippetPayload)
    logServerEvent("snippet_saved", { uid, snippetId })
  } catch (error) {
    console.error("[draft] Failed to persist snippet", error)
    logServerEvent("snippet_save_failed", { uid, error: (error as Error).message })
  }
  void recordDiagnostic({
    lastModelUsed: metadata.modelUsed,
    lastPronounPreference: pronounPreference,
    lastResolvedPronounPreference: resolvedPronounPreference,
    lastPronounResolutionReason: pronounResolution.reason,
    lastPronounResolutionSource: pronounResolution.source ?? null,
    lastInputReframed: inputReframed,
    lastInputReframedTier: inputReframedTier,
    lastErrorCode: null,
    lastUsage: usageAfterGeneration,
    lastRunAt: FieldValue.serverTimestamp(),
  })
  logDraftOutcome("SUCCESS", {
    latencyMs: generationTime,
    modelUsed: metadata.modelUsed,
    tokensUsed: providerMeta.tokensUsed,
  })

  return NextResponse.json({
    success: true,
    data: {
      generatedDraft,
      formattedDraft: formattedDraftStructure,
      metadata,
      meta: responseMeta,
      usage: usageAfterGeneration,
      snippetId,
      deescalationSummary,
    },
  })
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST to generate drafts.",
      },
    },
    { status: 405 },
  )
}
