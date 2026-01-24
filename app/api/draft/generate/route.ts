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
import { cleanStudentName } from "@/lib/draft/student-name"
import { normalizeGermanParentMessage } from "@/lib/draft/german-normalizer"
import { detectHighEmotionPhrases } from "@/lib/deescalation/detect"
import { rewriteHighEmotionText } from "@/lib/deescalation/rewrite"
import { canonicalizeLocaleIdentifier, resolveOutputLanguage } from "@/lib/draft/language"
import {
  applySignatureToDraft,
  resolveSignature,
  SignaturePayload,
} from "@/lib/draft/signature"
import { resolveTeacherSignatureName } from "@/lib/draft/teacher-signature"
import { isValidDraftRequest, OUT_OF_SCOPE_REDIRECT_MESSAGE } from "./scope-guard"
import { isDebugEnabled } from "@/lib/debug"
import { applyFinalGreetingGuard } from "@/lib/draft/final-greeting"
import {
  GreetingDecision,
  type GreetingSource,
  type NameConfidenceLevel,
  logGreetingDecision,
  resolveGreeting,
} from "@/lib/draft/greeting-resolution"

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
  outputLanguage?: string
  preferredLanguage?: string
  uiLocale?: string
  signature?: SignaturePayload
  greeting?: {
    text?: string
    name?: string
    confidence?: NameConfidenceLevel
    source?: GreetingSource
  }
  greetingFinal?: boolean
  greetingConfidence?: NameConfidenceLevel
  greetingSource?: GreetingSource
  situationRaw?: string
  messageType?: string
  scanId?: string
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

const STRONG_ENGLISH_PATTERNS = [/Subject:/i, /\bDear\b/i, /\bKind regards\b/i, /\bBest regards\b/i, /\bThank you\b/i, /\bPlease\b/i]

function containsStrongEnglishSignals(text: string) {
  const snippet = text.slice(0, 200)
  return STRONG_ENGLISH_PATTERNS.some((pattern) => pattern.test(snippet))
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

function resolveGreetingFromRawText(
  raw: string,
  language: string | undefined,
  messageType?: string,
) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  const locale = language?.toLowerCase().startsWith("de") ? "de" : "en"
  const greetingResult = resolveGreeting({
    cleanedOcrText: trimmed,
    locale,
    messageType,
  })
  const normalizedGreeting = greetingResult.greeting.trim()
  const hasSafeConfidence =
    greetingResult.confidence === "MEDIUM" || greetingResult.confidence === "HIGH"
  const greetingDidResolveName = greetingResult.source === "resolved-name"
  const greetingFinal =
    hasSafeConfidence && greetingDidResolveName && normalizedGreeting.length > 0
  return {
    greeting: normalizedGreeting || greetingResult.greeting,
    confidence: greetingResult.confidence,
    safeName: greetingResult.safeName ?? null,
    source: greetingResult.source,
    final: greetingFinal,
  }
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
  forceLanguage?: boolean,
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
      forceLanguage,
    })
  } catch (error) {
    return null
  }
}

export async function POST(request: Request) {
  const requestedAt = new Date()
  const requestStart = Date.now()
  const requestUrl = new URL(request.url)

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
  const requestedLanguageHint = payload?.outputLanguage ?? payload?.language
  const teacherPreferredLanguage = payload?.preferredLanguage
  const uiLocale = payload?.uiLocale
  const acceptLanguageHeader = request.headers.get("accept-language")
  const language = resolveOutputLanguage({
    explicit: requestedLanguageHint,
    preferred: teacherPreferredLanguage,
    uiLocale,
    acceptLanguage: acceptLanguageHeader,
  })
  payload.language = language
  payload.outputLanguage = language
  const canonicalUiLocale = canonicalizeLocaleIdentifier(uiLocale)
  const normalizedUiLocale = canonicalUiLocale ?? uiLocale
  const mode = resolveDraftMode(payload?.mode)
  const debugEnabled =
    isDebugEnabled(requestUrl.searchParams) || request.headers.get("x-debug") === "1"

  let greetingText = (payload.greeting?.text ?? "").trim()
  let greetingConfidence = payload.greetingConfidence ?? payload.greeting?.confidence ?? "NONE"
  let greetingSource = payload.greetingSource ?? payload.greeting?.source ?? "generic-fallback"
  let greetingName = payload.greeting?.name ?? null
  let greetingFinal = Boolean(payload.greetingFinal && greetingText)

  if (!greetingText && payload.situationRaw) {
    const resolvedGreeting = resolveGreetingFromRawText(
      payload.situationRaw,
      language,
      payload.messageType,
    )
    if (resolvedGreeting) {
      greetingText = resolvedGreeting.greeting
      greetingConfidence = resolvedGreeting.confidence
      greetingSource = resolvedGreeting.source
      greetingName = greetingName ?? resolvedGreeting.safeName
      greetingFinal = resolvedGreeting.final
    }
  }

  const finalGreetingLine = greetingFinal ? greetingText : null
  if (payload.greetingFinal && !greetingText && debugEnabled) {
    console.debug("[draft] greetingFinal was true but greeting text missing; ignoring final flag", {
      scanId: payload.scanId ?? null,
    })
  }
  const hasFinalGreeting = Boolean(finalGreetingLine)
  const greetingDecision: GreetingDecision = {
    greeting: greetingText,
    safeParentName: greetingName,
    confidence: greetingConfidence,
    source: greetingSource,
    locale: language?.toLowerCase().startsWith("de") ? "de" : "en",
    messageType: payload.messageType ?? undefined,
    scanId: payload.scanId ?? undefined,
    greetingFinal: Boolean(finalGreetingLine && greetingText),
  }
  if (debugEnabled) {
    logGreetingDecision("draft-receive", greetingDecision, requestUrl.searchParams)
  }

  const studentFirstNameInput =
    typeof payload?.studentFirstName === "string"
      ? payload.studentFirstName.trim()
      : typeof payload?.studentName === "string"
      ? payload.studentName.trim()
      : ""
  const sanitizedStudentFirstName = cleanStudentName(studentFirstNameInput)
  const studentNameForPayload = sanitizedStudentFirstName || ""

  const teacherSignatureName = resolveTeacherSignatureName(undefined, payload.signature?.line1)

  const resolvedSignature = resolveSignature({
    ...payload.signature,
    fallbackName: studentNameForPayload || undefined,
  })

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
  const isQaUser = isInternalQaUid(uid)
  const entitlements = await getUserEntitlements(uid, firestore)
  const { plan, usage: initialUsage, usageRecord, isProSubscriber } = entitlements
  const enforceUsageLimits = shouldRespectUsageLimit(uid)

  const userRef = firestore.collection("users").doc(uid)
  const diagnosticsRef = userRef.collection("diagnostics").doc("status")
  const insightsSummaryRef = userRef.collection("insights").doc("summary")
  const recordDiagnostic = async (fields: Record<string, unknown>) => {
    try {
      await diagnosticsRef.set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    } catch (error) {
      console.error("[draft] Failed to update diagnostics doc", error)
    }
  }

  if (enforceUsageLimits && plan === "free" && initialUsage.remaining !== null && initialUsage.remaining <= 0) {
    logServerEvent("draft_generation_denied_limit", { uid, plan })
    logDraftOutcome("RATE_LIMITED", { errorCode: "USAGE_LIMIT_EXCEEDED" })
    return NextResponse.json(buildUsageLimitError(initialUsage), { status: 429 })
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
  if (!isValidDraftRequest(currentSituation, mode)) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        code: "OUT_OF_SCOPE",
        message: OUT_OF_SCOPE_REDIRECT_MESSAGE,
        error: {
          code: "OUT_OF_SCOPE",
          message: OUT_OF_SCOPE_REDIRECT_MESSAGE,
        },
      },
      { status: 422 },
    )
  }
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
  const providerGreeting =
    greetingText.length > 0
      ? {
          text: greetingText,
          name: greetingName ?? undefined,
        }
      : undefined
  const providerInput: ProviderRequestInput = {
    situation: currentSituation,
    originalSituation: originalSituationForPrompt,
    tone,
    language,
    context: sanitizedContext,
    rewrite: Boolean(payload.rewrite),
    previousDraft: payload.previousDraft,
    pronounPreference: resolvedPronounPreference,
    mode,
    studentFirstName: studentNameForPayload || undefined,
    resolvedPronounPreference,
    signatureBlock: resolvedSignature.block,
    teacherSignatureName,
    greeting: providerGreeting,
    greetingFinal: hasFinalGreeting,
    greetingConfidence: payload.greetingConfidence,
    greetingSource: payload.greetingSource,
    messageType: payload.messageType,
    scanId: payload.scanId,
    uiLocale: normalizedUiLocale,
  }
  const fallbackContext: DraftFallbackContext = {
    mode,
    tone,
    language,
    requestId,
    uidHash,
    studentFirstName: studentNameForPayload || undefined,
    studentPronounPreference: resolvedPronounPreference,
    teacherSignatureName,
    greeting: providerGreeting,
    greetingFinal: hasFinalGreeting,
  }
  const finalizeDraft = (text: string) => {
    let curated = enforcePronouns(text, resolvedPronounPreference)
    curated = enforceTeacherNameStyle(curated, {
      firstName: studentNameForPayload || undefined,
      pronounPreference: resolvedPronounPreference,
      resolvedPronounPreference: resolvedPronounPreference,
    })
    return applyFinalGreetingGuard(curated, finalGreetingLine)
  }
  const finalizeDraftWithSignature = (text: string) =>
    applySignatureToDraft(finalizeDraft(text), resolvedSignature, mode)
  const runDraft = (forceLanguage = false) =>
    generateDraftWithFallback({ ...providerInput, forceLanguage }, fallbackContext)

  let draftAttempt = await runDraft()
  let providerResult = draftAttempt.result
  let usedFallback = draftAttempt.usedFallback
  let fallbackErrorCode = draftAttempt.errorCode
  let generatedDraft = finalizeDraftWithSignature(providerResult.text)
  let providerMeta = providerResult.providerMeta

  let forcedLanguageAttempted = false
  if (language === "de" && containsStrongEnglishSignals(generatedDraft)) {
    forcedLanguageAttempted = true
    draftAttempt = await runDraft(true)
    providerResult = draftAttempt.result
    usedFallback = draftAttempt.usedFallback
    fallbackErrorCode = draftAttempt.errorCode
    generatedDraft = finalizeDraftWithSignature(providerResult.text)
    providerMeta = providerResult.providerMeta
  }

  const shouldNormalizeGermanParentMessage =
    mode === "parent_message" &&
    (language?.toLowerCase().startsWith("de") || normalizedUiLocale?.toLowerCase().startsWith("de"))

  if (shouldNormalizeGermanParentMessage) {
    const germanNormalization = normalizeGermanParentMessage(generatedDraft)
    generatedDraft = germanNormalization.text
    if (germanNormalization.neutralized) {
      inputReframed = true
      if (!inputReframedTier) {
        inputReframedTier = "tier1"
        safetyFlags.add(`input-reframed-${inputReframedTier}`)
      }
    }
    generatedDraft = applyFinalGreetingGuard(generatedDraft, finalGreetingLine)
  }

  const formattedDraftStructure = formatDraftText(generatedDraft, language)
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
      const rewriteResult = await reRunWithRewrite(
        payload,
        generatedDraft,
        resolvedPronounPreference,
        mode,
        forcedLanguageAttempted,
      )
      if (rewriteResult) {
        generatedDraft = finalizeDraftWithSignature(rewriteResult.text)
        providerMeta = rewriteResult.providerMeta
        blockedDetection = detectBlockedLanguage(generatedDraft)
      }
    }
  }

  if (blockedDetection.detected) {
    return handleBlockedOutput()
  }

  let updatedUsage: MonthlyUsageRecord = usageRecord
  if (!isQaUser) {
    try {
      updatedUsage = await incrementUsage(uid, firestore, plan === "pro")
    } catch (error) {
      if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
        return NextResponse.json(buildUsageLimitError(initialUsage), { status: 429 })
      }
      console.error("[draft] Usage increment failed", error)
      throw error
    }
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
    signatureBlock: resolvedSignature.block,
  }

  const responseMeta = {
    inputReframed,
    inputReframedTier,
    latencyMs,
    usedFallback,
    errorCode: fallbackErrorCode,
    requestId,
  }

  const responseGreeting = {
    text: greetingDecision.greeting,
    name: greetingDecision.safeParentName,
    confidence: greetingDecision.confidence,
    final: Boolean(greetingDecision.greetingFinal),
    source: greetingDecision.source,
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
  const usageAfterGeneration = buildUsageResponse(updatedUsage, plan, { unlimited: isQaUser })
  console.info("[draft] usage", {
    uid,
    isQaUser,
    isProUser: isProSubscriber,
    usageBefore: initialUsage.currentMonthUsage,
    usageAfter: updatedUsage.generationCount,
    unlimitedFlag: usageAfterGeneration.unlimited,
  })

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
    signatureBlock: resolvedSignature.block,
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
  try {
    await userRef.set({ lastDiagnosticsRunAt: FieldValue.serverTimestamp() }, { merge: true })
  } catch (error) {
    console.error("[draft] Failed to update diagnostics timestamp on user doc", error)
  }
  try {
    await insightsSummaryRef.set(
      {
        draftsCreated: FieldValue.increment(1),
        lastDraftAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[draft] Failed to update insights summary", error)
  }
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
      greeting: responseGreeting,
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
