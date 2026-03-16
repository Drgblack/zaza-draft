import { NextResponse, type NextRequest } from "next/server"
import { generateDraft } from "@/lib/ai/provider"
import { classifyGenerationRequest } from "@/lib/generation/classification"
import { runSafetyEngine, type SafetyEngineOutput } from "@/src/lib/safetyEngine"
import type { DraftLanguage, DraftMode } from "@/lib/types"

const INSTANT_DRAFT_COOKIE = "zaza_instant_draft_used"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const MAX_MESSAGE_LENGTH = 4000
const MIN_MESSAGE_LENGTH = 12

interface InstantDraftRequest {
  message?: unknown
  language?: unknown
}

function inferLanguage(rawLanguage: unknown, acceptLanguageHeader: string | null): DraftLanguage {
  if (rawLanguage === "de" || rawLanguage === "en") {
    return rawLanguage
  }

  if (acceptLanguageHeader?.toLowerCase().startsWith("de")) {
    return "de"
  }

  return "en"
}

function inferDraftMode(message: string): DraftMode {
  const normalized = message.trim()
  const lineCount = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  const hasEmailMarkers =
    /^(subject:|betreff:|dear\b|hello\b|hi\b|guten tag\b|liebe(?:r|n)?\b|sehr geehrte\b)/im.test(
      normalized,
    ) ||
    /\b(best regards|kind regards|sincerely|mit freundlichen grüßen|herzliche grüße|freundliche grüße)\b/i.test(
      normalized,
    ) ||
    /\byour child\b|\byour son\b|\byour daughter\b|\bi wanted to let you know\b|\bi wanted to update you\b/i.test(
      normalized,
    )

  if (!hasEmailMarkers && normalized.length <= 500 && lineCount <= 6) {
    return "report_comment"
  }

  return "parent_message"
}

function toSafeDemoSafetyAnalysis(
  analysis: SafetyEngineOutput | null,
): SafetyEngineOutput | null {
  if (!analysis) {
    return null
  }

  return {
    ...analysis,
    // Avoid logging full prompt content via the provider's professional-risk debug path.
    professionalRiskFlags: [],
  }
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(INSTANT_DRAFT_COOKIE)?.value === "1") {
    return NextResponse.json(
      {
        success: false,
        limitReached: true,
        error: {
          code: "ANONYMOUS_LIMIT_REACHED",
          message: "Instant Draft is limited to one anonymous rewrite. Create a free account to continue writing safely.",
        },
      },
      {
        status: 429,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }

  let payload: InstantDraftRequest = {}
  try {
    payload = (await request.json()) as InstantDraftRequest
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_REQUEST", message: "Unable to read the request body." },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : ""
  if (message.length < MIN_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MESSAGE_TOO_SHORT",
          message: "Paste a parent email or report comment to try the rewrite.",
        },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MESSAGE_TOO_LONG",
          message: "That sample is too long for the instant test. Create a free account for full drafting.",
        },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }

  const language = inferLanguage(payload.language, request.headers.get("accept-language"))
  const mode = inferDraftMode(message)
  const generationTrace = classifyGenerationRequest({
    draftMode: mode,
    locale: language,
    situation: message,
    requestedInputMode: "safe_draft",
    requestedSourceType: "typed_text",
    messageType: null,
    sourceConfidence: null,
    hasScanId: false,
    hasVoiceSessionId: false,
  })

  const safetyAnalysis =
    mode === "parent_message"
      ? toSafeDemoSafetyAnalysis(
          await runSafetyEngine({
            rawMessage: message,
            messageDirection: generationTrace.metadata.direction,
            inputMode: generationTrace.metadata.mode,
          }),
        )
      : null

  try {
    const result = await generateDraft({
      situation: message,
      originalSituation: message,
      rewrite: true,
      previousDraft: message,
      generationMetadata: generationTrace.metadata,
      tone: "professional",
      language,
      pronounPreference: "auto",
      mode,
      safetyAnalysis,
    })

    const response = NextResponse.json(
      {
        success: true,
        data: {
          rewrittenText: result.text,
          modeUsed: mode,
          limitReached: true,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    )

    response.cookies.set({
      name: INSTANT_DRAFT_COOKIE,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REWRITE_FAILED",
          message: error instanceof Error ? error.message : "Unable to generate a safe rewrite right now.",
        },
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }
}
