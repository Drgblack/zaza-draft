import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { detectSensitiveContent } from "@/lib/safety"
import { logServerEvent } from "@/lib/analytics"
import { buildUsageResponse, incrementUsage, MonthlyUsageRecord } from "@/lib/usage"
import { getUserEntitlements } from "@/lib/entitlements"
import type { DraftLanguage } from "@/lib/types"
import { generateDraft, ProviderResult } from "@/lib/ai/provider"
import { enforceDraftRateLimit, RateLimitError } from "@/lib/rate-limit"
import { createHash } from "crypto"
import { FieldValue } from "firebase-admin/firestore"

const ALLOWED_TONES = ["warm", "professional", "direct", "empathetic"] as const
const ALLOWED_LANGUAGES = ["en", "de"] as const
const TONE_DESCRIPTIONS: Record<(typeof ALLOWED_TONES)[number], string> = {
  warm: "Warm & Encouraging",
  professional: "Professional & Neutral",
  direct: "Direct & Clear",
  empathetic: "Empathetic & Supportive",
}

type LanguageKey = (typeof ALLOWED_LANGUAGES)[number]
type ToneKey = (typeof ALLOWED_TONES)[number]

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

const BANNED_TERMS = ["stupid", "idiot", "incompetent", "failure", "rage", "hate"]

function detectBannedTerms(text: string) {
  const pattern = new RegExp(`\\b(${BANNED_TERMS.join("|")})\\b`, "gi")
  const matches: string[] = []
  let match
  while ((match = pattern.exec(text))) {
    matches.push(match[0])
  }
  return matches
}

async function reRunWithRewrite(
  payload: GenerateDraftRequest,
  previousDraft: string,
): Promise<ProviderResult | null> {
  try {
    return await generateDraft({
      situation: payload.situation,
      tone: payload.tone,
      language: payload.language as DraftLanguage,
      context: payload.context,
      rewrite: true,
      previousDraft,
    })
  } catch (error) {
    return null
  }
}

export async function POST(request: Request) {
  const requestedAt = new Date()

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
  const userHash = createHash("sha256").update(uid).digest("hex").slice(0, 12)
  const logDraftOutcome = (
    outcomeCode: string,
    extras: { latencyMs?: number; modelUsed?: string; tokensUsed?: number; errorCode?: string } = {},
  ) => {
    console.info("[draft] generate outcome", {
      userHash,
      tone,
      language,
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

  if (plan === "free" && usage.remaining !== null && usage.remaining <= 0) {
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

  const detection = detectSensitiveContent(situation)
  const sanitizedSituation = detection.sanitized
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

  const generationStart = Date.now()
  let generatedDraft: string
  let providerMeta: { modelUsed: string; latencyMs: number; tokensUsed?: number }
  let rewriteAttempted = false
  try {
    const result = await generateDraft({
      situation: sanitizedSituation,
      tone,
      language: language as LanguageKey,
      context: sanitizedContext,
      rewrite: Boolean(payload.rewrite),
      previousDraft: payload.previousDraft,
    })
    generatedDraft = result.text
    providerMeta = result.providerMeta
  } catch (error) {
    console.error("[draft] AI generation failed", error)
    logServerEvent("draft_generation_failed", {
      uid,
      plan,
      tone,
      language,
      error: error instanceof Error ? error.message : "unknown",
    })
    logDraftOutcome("AI_GENERATION_FAILED", { errorCode: "AI_GENERATION_FAILED" })
    void recordDiagnostic({ lastErrorCode: "AI_GENERATION_FAILED" })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_GENERATION_FAILED",
          message: error instanceof Error ? error.message : "Unable to generate draft.",
        },
      },
      { status: 502 },
    )
  }
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

  let bannedMatches = detectBannedTerms(generatedDraft)
  if (bannedMatches.length > 0 && !rewriteAttempted) {
    rewriteAttempted = true
    const rewriteResult = await reRunWithRewrite(payload, generatedDraft)
    if (rewriteResult) {
      generatedDraft = rewriteResult.text
      providerMeta = rewriteResult.providerMeta
      bannedMatches = detectBannedTerms(generatedDraft)
      logDraftOutcome("SUCCESS", { modelUsed: providerMeta.modelUsed, tokensUsed: providerMeta.tokensUsed })
    }
  }

  if (bannedMatches.length > 0) {
    logDraftOutcome("INVALID_REQUEST", { errorCode: "BANNED_TERM_DETECTED" })
    void recordDiagnostic({ lastErrorCode: "BANNED_TERM_DETECTED" })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "The generated content contained prohibited language. Please try again with different wording.",
        },
      },
      { status: 422 },
    )
  }

  let updatedUsage: MonthlyUsageRecord
  try {
    updatedUsage = await incrementUsage(uid, firestore, plan === "pro")
  } catch (error) {
    if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
      return NextResponse.json(buildUsageLimitError(usage), { status: 429 })
    }
    console.error("[draft] Usage increment failed", error)
    throw error
  }

  const safetyFlagList = safetyFlags.size ? Array.from(safetyFlags) : ["no-sensitive-content"]

  const metadata = {
    userId: uid,
    toneUsed: tone,
    language,
    modelUsed: providerMeta.modelUsed,
    tokensUsed: providerMeta.tokensUsed ?? null,
    generationTime,
    wordCount: countWords(generatedDraft),
    safetyFlags: safetyFlagList,
    generatedAt: new Date().toISOString(),
    requestedAt: requestedAt.toISOString(),
    contextUsed: sanitizedContext,
  }

  logServerEvent("draft_generation", {
    uid,
    plan,
    tone,
    language,
    wordCount: metadata.wordCount,
  })

  let snippetId: string | null = null
  const snippetCollection = firestore.collection("users").doc(uid).collection("snippets")
  const snippetDoc = snippetCollection.doc()
  snippetId = snippetDoc.id
  const usageAfterGeneration = buildUsageResponse(updatedUsage, plan)

  const snippetPayload = {
    promptText: detection.matches.length === 0 ? sanitizedSituation : undefined,
    generatedText: generatedDraft,
    tone,
    language,
    contextUsed: sanitizedContext,
    wordCount: metadata.wordCount,
    modelUsed: metadata.modelUsed,
    safetyFlags: metadata.safetyFlags,
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
      metadata,
      usage: usageAfterGeneration,
      snippetId,
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
