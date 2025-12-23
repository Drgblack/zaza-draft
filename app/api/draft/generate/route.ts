import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { detectSensitiveContent } from "@/lib/safety"
import { logServerEvent } from "@/lib/analytics"
import { buildUsageResponse, fetchUsageRecord, incrementUsage, PlanType, MonthlyUsageRecord } from "@/lib/usage"

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

function buildPlaceholderDraft(params: {
  situation: string
  tone: ToneKey
  language: LanguageKey
  context?: GenerateDraftRequest["context"]
  rewrite?: boolean
}) {
  if (params.language === "de") {
    return buildGermanDraft(params)
  }

  return buildEnglishDraft(params)
}

function buildEnglishDraft(params: {
  situation: string
  tone: ToneKey
  context?: GenerateDraftRequest["context"]
  rewrite?: boolean
}) {
  const { situation, tone, context, rewrite } = params
  const toneDescription = TONE_DESCRIPTIONS[tone] ?? tone
  const contextLine = buildContextLine(context)
  const rewriteLine = rewrite
    ? `This version tightens the previous note while staying true to the ${toneDescription.toLowerCase()} tone you requested.`
    : ""

  const body = [
    `Dear Parent/Guardian,`,
    `I want to share a thoughtful update about the situation you described: ${situation}. ${contextLine}`,
    `Your student continues to show steady effort, and I am highlighting only what you provided so no assumptions are made.`,
    `This draft reflects a ${toneDescription.toLowerCase()} approach and focuses only on observable details. ${rewriteLine}`.trim(),
    `Please let me know if you would like to discuss next steps together.`,
  ]

  return body.filter(Boolean).join("\n\n")
}

function buildGermanDraft(params: {
  situation: string
  tone: ToneKey
  context?: GenerateDraftRequest["context"]
  rewrite?: boolean
}) {
  const { situation, tone, context, rewrite } = params
  const toneDescription = TONE_DESCRIPTIONS[tone] ?? tone
  const contextLine = buildContextLine(context)
  const rewriteLine = rewrite
    ? `Dieser Text bleibt im gewünschten ${toneDescription.toLowerCase()} Stil und baut auf der vorherigen Version auf.`
    : ""

  const body = [
    `Liebe Eltern und Erziehungsberechtigte,`,
    `Ich möchte ein kurzes Update zur beschriebenen Situation teilen: ${situation}. ${contextLine}`,
    `Ihre Schülerin oder Ihr Schüler zeigt weiter durchgängig Einsatz, und ich beziehe mich ausschließlich auf die von Ihnen bereitgestellten Informationen.`,
    `Der Text bleibt professionell und sachlich mit einem ${toneDescription.toLowerCase()} Ton. ${rewriteLine}`.trim(),
    `Bitte geben Sie Bescheid, wenn wir gemeinsam über mögliche nächste Schritte sprechen sollen.`,
  ]

  return body.filter(Boolean).join("\n\n")
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
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status: 401 },
    )
  }

  const { uid, firestore } = authContext
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
  const userRef = firestore.collection("users").doc(uid)
  const userSnapshot = await userRef.get()
  const userData = userSnapshot.data() ?? {}
  const subscriptionStatus = (userData.subscriptionStatus as string) ?? "none"
  const plan: PlanType = ["active", "trialing"].includes(subscriptionStatus) ? "pro" : "free"

  const usageSnapshot = await fetchUsageRecord(uid, firestore)
  if (plan === "free" && usageSnapshot.generationCount >= 10) {
    logServerEvent("draft_generation_denied_limit", { uid, plan })
    return NextResponse.json(
      buildUsageLimitError(buildUsageResponse(usageSnapshot, plan)),
      { status: 429 },
    )
  }

  const sanitizedContext = {
    subject: payload.context?.subject ? payload.context.subject.trim() : undefined,
    gradeLevel: payload.context?.gradeLevel ? payload.context.gradeLevel.trim() : undefined,
  }

  const detection = detectSensitiveContent(situation)
  if (detection.matches.length > 0) {
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
  const generatedDraft = buildPlaceholderDraft({
    situation,
    tone,
    language,
    context: sanitizedContext,
    rewrite: Boolean(payload.rewrite),
  })
  const generationTime = Date.now() - generationStart

  let updatedUsage: MonthlyUsageRecord
  try {
    updatedUsage = await incrementUsage(uid, firestore, plan === "pro")
  } catch (error) {
    if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
      return NextResponse.json(
        buildUsageLimitError(buildUsageResponse(usageSnapshot, plan)),
        { status: 429 },
      )
    }
    console.error("[draft] Usage increment failed", error)
    throw error
  }

  const metadata = {
    userId: uid,
    toneUsed: tone,
    language,
    modelUsed: "zaza-placeholder",
    generationTime,
    wordCount: countWords(generatedDraft),
    safetyFlags: detection.matches.length
      ? detection.matches.map((match) => `detected-${match.type}`)
      : ["no-sensitive-content"],
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

  return NextResponse.json({
    success: true,
    data: {
      generatedDraft,
      metadata,
      usage: buildUsageResponse(updatedUsage, plan),
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
