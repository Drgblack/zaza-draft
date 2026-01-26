import { NextResponse } from "next/server"
import {
  detectSensitiveContent,
  detectBlockedLanguage,
  reframeBlockedLanguage,
  BlockedLanguageTier,
} from "@/lib/safety"
import type { DraftLanguage, DraftMode, PronounPreference } from "@/lib/types"
import { generateDraft, ProviderMeta, ProviderResult } from "@/lib/ai/provider"
import { enforcePronouns, inferPronounResolution } from "@/lib/text/pronouns"
import { enforceDraftRateLimit, RateLimitError } from "@/lib/rate-limit"
import { createHash, randomUUID } from "crypto"
import { resolveDraftMode } from "@/lib/draft-mode"
import {
  buildUsageResponse,
  getCurrentMonthKey,
  incrementUsage,
  type MonthlyUsageRecord,
} from "@/lib/usage"
import { logServerEvent } from "@/lib/analytics"
import { getUserEntitlements } from "@/lib/entitlements"
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
import { sanitizeEmailText } from "@/lib/text/email-sanitizer"
import { canonicalizeLocaleIdentifier, resolveOutputLanguage } from "@/lib/draft/language"
import {
  applySignatureToDraft,
  resolveSignature,
  SignaturePayload,
  type ResolvedSignature,
} from "@/lib/draft/signature"
import { resolveTeacherSignatureName } from "@/lib/draft/teacher-signature"
import { ensureSingleSignOff } from "@/lib/draft/ensure-single-signoff"
import { isValidDraftRequest, OUT_OF_SCOPE_REDIRECT_MESSAGE } from "./scope-guard"
import { isDebugEnabled } from "@/lib/debug"
import { applyFinalGreetingGuard } from "@/lib/draft/final-greeting"
import {
  GreetingDecision,
  greetingWithName,
  type GreetingLocale,
  type GreetingSource,
  logGreetingDecision,
  resolveGreeting,
  scoreSafeName,
  type NameConfidenceLevel,
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

const DEV_BYPASS_HEADER = "x-zaza-dev-bypass"
const DEV_BYPASS_UID = "dev-user"
const DEV_ENV_ALLOWED = new Set(["development", "test"])

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

  return pieces.join(" ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ") + "."
}

const GENERIC_GREETING_TEXTS = new Set([
  "Liebe Eltern,",
  "Liebe Eltern",
  "Liebe Erziehungsberechtigte,",
  "Liebe Erziehungsberechtigte",
])

const EXTRA_SIGNOFF_PATTERNS = [/mit nachdruck/i]

const STRONG_ENGLISH_PATTERNS = [/Subject:/i, /\bDear\b/i, /\bKind regards\b/i, /\bBest regards\b/i, /\bThank you\b/i, /\bPlease\b/i]

function detectTrailingName(raw: string, locale: GreetingLocale) {
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const candidate = lines[i]
    if (!candidate) {
      continue
    }
    const score = scoreSafeName(candidate, locale)
    if (score.level === "NONE") {
      continue
    }
    return {
      greeting: greetingWithName(locale, candidate),
      confidence: score.level,
      safeName: candidate,
      source: "resolved-name" as GreetingSource,
      final: true,
    }
  }

  return null
}

function containsStrongEnglishSignals(text: string) {
  const snippet = text.slice(0, 200)
  return STRONG_ENGLISH_PATTERNS.some((pattern) => pattern.test(snippet))
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

const MIN_BODY_WORDS = 60
const MIN_BODY_PARAGRAPHS = 2
const DUPLICATE_GREETING_WINDOW = 5

function removeDuplicateGreeting(body: string, greetingLine?: string | null) {
  if (!greetingLine) {
    return body
  }
  const normalizedGreeting = greetingLine.trim()
  if (!normalizedGreeting) {
    return body
  }
  const lines = body.split(/\r?\n/)
  let firstInstanceReached = false
  let nonEmptyCount = 0
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      continue
    }
    nonEmptyCount += 1
    if (!(trimmed === normalizedGreeting || trimmed.startsWith(normalizedGreeting))) { continue }
    if (!firstInstanceReached) {
      firstInstanceReached = true
      continue
    }
    if (nonEmptyCount <= DUPLICATE_GREETING_WINDOW) {
      lines[i] = ""
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n")
}

function getParagraphCountExcludingGreeting(structure: DraftStructure, greetingLine?: string | null) {
  if (!structure.paragraphs.length) {
    return 0
  }
  const normalizedGreeting = greetingLine?.trim() ?? ""
  return structure.paragraphs.filter((paragraph, index) => {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      return false
    }
    if (index === 0 && normalizedGreeting && trimmed === normalizedGreeting) {
      return false
    }
    return true
  }).length
}

function buildDeterministicTemplateBody(greetingLine: string, language?: string) {
  const isGerman = language?.toLowerCase().startsWith("de")
  const paragraphs = isGerman
    ? [
        "Vielen Dank, dass Sie Ihre Perspektive geteilt haben; mir ist wichtig, dass wir diesen Punkt gemeinsam ernst nehmen.",
        "Als nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤chsten Schritt werde ich das Verhalten weiterhin dokumentieren und ein kurzes ReflexionsgesprÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ch mit dem Kind vorbereiten, das wir danach mit Ihnen reflektieren kÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¶nnen.",
        "Bitte schlagen Sie zwei kurze Termine vor, an denen wir telefonisch oder per Videocall die nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤chsten Schritte besprechen und offene Fragen beantworten.",
      ]
    : [
        "Thank you for sharing your concern; my priority is to address it calmly and respectfully.",
        "As a next step, I will gather the details, summarize the key observations, and prepare a practical plan we can work through together.",
        "Please let me know a couple of times that work for you so we can have a quick phone or video call to stay aligned.",
      ]
  return `${greetingLine}\n\n${paragraphs.join("\n\n")}`
}

function detectExtraSignoffName(raw: string, locale: GreetingLocale) {
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const pattern of EXTRA_SIGNOFF_PATTERNS) {
    const index = lines.findIndex((line) => pattern.test(line))
    if (index >= 0 && index + 1 < lines.length) {
      const candidate = lines[index + 1]
      const score = scoreSafeName(candidate, locale)
      if (score.level === "MEDIUM" || score.level === "HIGH") {
        return {
          greeting: greetingWithName(locale, candidate),
          confidence: score.level,
          safeName: candidate,
          source: "resolved-name" as GreetingSource,
          final: true,
        }
      }
    }
  }
  return null
}

  function normalizeName(value?: string | null) {
    if (!value) {
      return ""
    }
    const collapsed = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
    return collapsed.replace(/([,;:.!?])\1+$/, "$1")
  }

  function normalizeGreetingValue(value: string) {
    return normalizeName(value)
  }

function resolveGreetingFromRawText(
  raw: string,
  language: string | undefined,
  messageType?: string,
) {
  const sanitized = sanitizeEmailText(raw)
  const cleaned = sanitized.cleanText.trim()
  if (!cleaned) {
    return null
  }
  const locale = language?.toLowerCase().startsWith("de") ? "de" : "en"
  const extraSignoff = detectExtraSignoffName(cleaned, locale)
  if (extraSignoff) {
    return extraSignoff
  }
  const trailingName = detectTrailingName(cleaned, locale)
  if (trailingName) {
    return trailingName
  }
  const greetingResult = resolveGreeting({
    cleanedOcrText: cleaned,
    locale,
    messageType,
  })
  const normalizedGreeting = normalizeGreetingValue(greetingResult.greeting)
    const normalizedSafeName = greetingResult.safeName
      ? normalizeName(greetingResult.safeName)
      : null
  const hasSafeConfidence =
    greetingResult.confidence === "MEDIUM" || greetingResult.confidence === "HIGH"
  const greetingDidResolveName = greetingResult.source === "resolved-name"
  const greetingFinal = hasSafeConfidence && greetingDidResolveName && normalizedGreeting.length > 0
  return {
    greeting: normalizedGreeting || greetingResult.greeting,
    confidence: greetingResult.confidence,
    safeName: normalizedSafeName ?? null,
    source: greetingResult.source,
    final: greetingFinal,
  }
}

function buildUsageLimitError(usage: ReturnType<typeof buildUsageResponse>) {
  return {
    message: "You have reached your monthly draft limit. Upgrade to unlock Draft Pro for unlimited generations.",
    data: {
      usage,
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
  const requestId = randomUUID()
  const responseHeaders = {
    "x-request-id": requestId,
  }
  const ok = (data: unknown, status = 200) =>
    NextResponse.json({ success: true, requestId, data }, { status, headers: responseHeaders })
  const fail = (
    status: number,
    code: string,
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    const payload: Record<string, unknown> = {
      success: false,
      requestId,
      error: {
        code,
        message,
      },
    }
    if (extra) {
      const { error: extraError, ...rest } = extra
      if (extraError && typeof extraError === "object" && !Array.isArray(extraError)) {
        payload.error = {
          ...(payload.error as Record<string, unknown>),
          ...extraError,
        }
      }
      Object.assign(payload, rest)
    }
    return NextResponse.json(payload, { status, headers: responseHeaders })
  }

  try {
    const requestedAt = new Date()
    const requestStart = Date.now()
    const requestUrl = new URL(request.url)

    let payload: GenerateDraftRequest
    try {
      payload = await request.json()
    } catch (error) {
      return fail(400, "INVALID_JSON", "Payload must be JSON.")
    }

    if (!payload || typeof payload !== "object") {
      return fail(422, "VALIDATION", "Payload must be a JSON object.")
    }

    if (payload.situation !== undefined && typeof payload.situation !== "string") {
      return fail(422, "VALIDATION", "The situation field must be text.")
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

  let greetingText = normalizeGreetingValue(payload.greeting?.text ?? "")
  let greetingConfidence = payload.greetingConfidence ?? payload.greeting?.confidence ?? "NONE"
  let greetingSource = payload.greetingSource ?? payload.greeting?.source ?? "generic-fallback"
  let greetingName = payload.greeting?.name ? normalizeName(payload.greeting.name) : null
  if (!greetingName) {
    greetingName = null
  }
  let greetingFinal = Boolean(payload.greetingFinal && greetingText)
  const normalizedRequestGreeting = greetingText.replace(/\s+/g, " ").trim()
  const shouldResetGreeting =
    Boolean(greetingText) &&
    (greetingSource === "generic-fallback" ||
      greetingConfidence === "NONE" ||
      GENERIC_GREETING_TEXTS.has(normalizedRequestGreeting))
  if (shouldResetGreeting) {
    greetingText = ""
    greetingConfidence = "NONE"
    greetingSource = "generic-fallback"
    greetingName = null
    greetingFinal = false
  }

  if (!greetingText && payload.situationRaw) {
    const resolvedGreeting = resolveGreetingFromRawText(
      payload.situationRaw,
      language,
      payload.messageType,
    )
    if (resolvedGreeting) {
      greetingText = normalizeGreetingValue(resolvedGreeting.greeting)
      greetingConfidence = resolvedGreeting.confidence
      greetingSource = resolvedGreeting.source
      const normalizedResolvedName = resolvedGreeting.safeName
        ? normalizeName(resolvedGreeting.safeName)
        : null
      if (normalizedResolvedName) {
        greetingName = greetingName || normalizedResolvedName
      }
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
    return fail(400, "INVALID_MODE", "Please select a valid mode option.")
  }

  if (promptTooLong) {
    return fail(400, "PROMPT_TOO_LONG", "Please keep prompts under 2000 characters.")
  }

  if (!situation) {
    return fail(400, "MISSING_INPUT", "Please describe the classroom situation before generating a draft.")
  }

  if (!tone || !ALLOWED_TONES.includes(tone)) {
    return fail(400, "INVALID_TONE", "Select one of the supported tone options.")
  }

  if (!language) {
    return fail(400, "INVALID_LANGUAGE", "Language must be English or German (EN/DE).")
  }

  const pronounPreference = parsePronounPreference(payload?.pronounPreference)
  const pronounResolution = inferPronounResolution(
    pronounPreference,
    studentFirstNameInput || undefined,
    situation,
  )
  const resolvedPronounPreference = pronounResolution.resolvedPreference
  const sanitizedInput = sanitizeEmailText(situation)
  const cleanedSituationText = sanitizedInput.cleanText
  const requiresSubjectDetail = Boolean(payload.context?.subject)
  const insufficientInput =
    sanitizedInput.wordCount < 20 || (requiresSubjectDetail && sanitizedInput.substantiveLines === 0)
  if (insufficientInput) {
    return fail(
      422,
      "INSUFFICIENT_INPUT",
      "After removing Gmail UI noise, the note doesnÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢t include enough detail to craft a responsible reply. Please describe the parent concern in at least 20 words.",
      {
        data: {
          wordCount: sanitizedInput.wordCount,
          substantiveLines: sanitizedInput.substantiveLines,
          removedLines: sanitizedInput.removedLines,
        },
      },
    )
  }

    const bypassHeader = request.headers.get(DEV_BYPASS_HEADER)
    const devBypassActive = DEV_ENV_ALLOWED.has(process.env.NODE_ENV ?? "") && bypassHeader === "1"
    let authContext
    if (devBypassActive) {
      authContext = {
        uid: DEV_BYPASS_UID,
        auth: null,
        firestore: null,
        storage: null,
      }
    } else {
      const { authorizeFirebaseRequest, FirebaseAuthorizationError } = await import(
        "@/lib/firebase/server",
      )
      try {
        authContext = await authorizeFirebaseRequest(request)
      } catch (error) {
        const status =
          error instanceof FirebaseAuthorizationError ? error.statusCode : 401
        return fail(status, "UNAUTHORIZED", (error as Error).message || "Unauthorized")
      }
    }

  const { uid, firestore } = authContext
  const isDevBypassRequest = devBypassActive
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
  const maybeLogServerEvent = (eventName: string, payload: Record<string, unknown>) => {
    if (!isDevBypassRequest) {
      logServerEvent(eventName, payload)
    }
  }
  if (!firestore && !isDevBypassRequest) {
    return fail(500, "FIRESTORE_UNAVAILABLE", "Unable to access Firestore.")
  }
  let FieldValue: typeof import("firebase-admin/firestore").FieldValue | null = null
  if (firestore) {
    const firestoreModule = await import("firebase-admin/firestore")
    FieldValue = firestoreModule.FieldValue
  }
  const isQaUser = isInternalQaUid(uid)
  const defaultUsageRecord: MonthlyUsageRecord = {
    month: getCurrentMonthKey(),
    generationCount: 0,
    lastReset: new Date().toISOString(),
  }
  const defaultUsage = buildUsageResponse(defaultUsageRecord, "free")
  const devDefaults = {
    plan: "free" as const,
    usage: defaultUsage,
    usageRecord: defaultUsageRecord,
    isProSubscriber: false,
  }
  const entitlements = isDevBypassRequest
    ? devDefaults
    : await getUserEntitlements(uid, firestore!)
  const {
    plan,
    usage: initialUsage,
    usageRecord,
    isProSubscriber,
  } = entitlements
  const enforceUsageLimits = isDevBypassRequest ? false : shouldRespectUsageLimit(uid)

  const userRef = firestore ? firestore.collection("users").doc(uid) : null
  const diagnosticsRef = userRef?.collection("diagnostics").doc("status") ?? null
  const insightsSummaryRef = userRef?.collection("insights").doc("summary") ?? null
  const recordDiagnostic = async (fields: Record<string, unknown>) => {
    if (!diagnosticsRef || !FieldValue) {
      return
    }
    try {
      await diagnosticsRef.set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    } catch (error) {
      console.error("[draft] Failed to update diagnostics doc", error)
    }
  }

  if (
    !isDevBypassRequest &&
    enforceUsageLimits &&
    plan === "free" &&
    initialUsage.remaining !== null &&
    initialUsage.remaining <= 0
  ) {
    maybeLogServerEvent("draft_generation_denied_limit", { uid, plan })
    logDraftOutcome("RATE_LIMITED", { errorCode: "Mit freundlichen GrÃƒÆ’Ã‚Â¼ÃƒÆ’Ã…Â¸en" })
    const usageLimitError = buildUsageLimitError(initialUsage)
    return fail(429, "USAGE_LIMIT_EXCEEDED", usageLimitError.message, { data: usageLimitError.data })
  }

  if (!isDevBypassRequest) {
    try {
      await enforceDraftRateLimit(uid, firestore!)
    } catch (error) {
      if (error instanceof RateLimitError) {
        maybeLogServerEvent("draft_generation_rate_limited", { uid, plan })
        logDraftOutcome("RATE_LIMITED", { errorCode: "RATE_LIMITED" })
        void recordDiagnostic({ lastErrorCode: "RATE_LIMITED" })
        const waitSeconds = Math.ceil(error.retryAfterMs / 1000)
        return fail(429, "RATE_LIMITED", `You can generate a new draft in ${waitSeconds} seconds.`)
      }

      console.error("[draft] Rate limit transaction failed", error)
      throw error
    }
  }

  const sanitizedContext: {
    subject?: string
    gradeLevel?: string
  } = {}

  if (payload.context?.subject?.trim()) {
    sanitizedContext.subject = payload.context.subject.trim()
  }

  if (payload.context?.gradeLevel?.trim()) {
    sanitizedContext.gradeLevel = payload.context.gradeLevel.trim()
  }

  const snippetCollection = firestore
    ? firestore.collection("users").doc(uid).collection("snippets")
    : null
  const snippetDoc = snippetCollection
    ? snippetCollection.doc(requestId)
    : {
        id: requestId,
        set: async () => null,
      }

  const detection = detectSensitiveContent(cleanedSituationText)
  let sanitizedSituation = detection.sanitized
  const safetyFlags = new Set<string>()
  if (detection.matches.length > 0) {
    detection.matches.forEach((match) => safetyFlags.add(`input-${match.type}`))
    void recordDiagnostic({ lastErrorCode: "SENSITIVE_CONTENT" })
    return fail(422, "SENSITIVE_CONTENT", "Please remove emails, phone numbers, and addresses from the prompt before generating. The redacted preview can guide you.", {
      data: {
        redactedPreview: detection.sanitized,
      },
    })
  }

  let currentSituation = sanitizedSituation
  if (!isValidDraftRequest(currentSituation, mode)) {
    return fail(422, "OUT_OF_SCOPE", OUT_OF_SCOPE_REDIRECT_MESSAGE)
  }
  let inputReframed = false
  let inputReframedTier: BlockedLanguageTier | null = null

  const sendBlockedLanguageError = (tier: BlockedLanguageTier) => {
    maybeLogServerEvent("draft_generation_blocked_language", { uid, plan, tier })
    logDraftOutcome("INVALID_REQUEST", { errorCode: "BLOCKED_LANGUAGE" })
    void recordDiagnostic({
      lastErrorCode: "BLOCKED_LANGUAGE",
      lastBlockedLanguageTier: tier,
    })
    const blockedResponse = buildBlockedLanguageResponse(tier)
    return fail(422, "BLOCKED_LANGUAGE", blockedResponse.message, {
      data: {
        blockedLanguage: blockedResponse,
      },
    })
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
  const finalizeWithGreeting = (text: string) =>
    removeDuplicateGreeting(finalizeDraftWithSignature(text), finalGreetingLine)

  const DEFAULT_CLOSINGS = {
    en: "Kind regards",
    de: "Mit freundlichen Grüßen",
  }
  const FALLBACK_SIGNATURES = {
    en: "Your child's teacher",
    de: "Ihre Klassenlehrkraft",
  }

  function ensureClosingAndSignature(text: string, language?: string, teacherName?: string) {
    const normalizedLanguage = language?.toLowerCase() ?? "en"
    const closingLine = normalizedLanguage.startsWith("de")
      ? DEFAULT_CLOSINGS.de
      : DEFAULT_CLOSINGS.en
    const signatureLine =
      (teacherName?.trim()) || (normalizedLanguage.startsWith("de") ? FALLBACK_SIGNATURES.de : FALLBACK_SIGNATURES.en)
    const trimmed = text.trim()
    const lines = trimmed
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
    const normalizeMatch = (value: string) => value.replace(/[.,;:]+$/, "").trim().toLowerCase()
    const closingMatch = normalizeMatch(closingLine)
    const signatureMatch = normalizeMatch(signatureLine)
    const hasClosing = lines.some((line) => normalizeMatch(line) === closingMatch)
    const hasSignature =
      Boolean(signatureLine) && lines.some((line) => normalizeMatch(line) === signatureMatch)
    let result = trimmed
    if (!hasClosing) {
      result = `${result}\n\n${closingLine}`
    }
    if (!hasSignature && signatureLine) {
      result = `${result}\n${signatureLine}`
    }
    return result
  }
  const runDraft = (forceLanguage = false, forceContinuation = false) =>
    generateDraftWithFallback(
      { ...providerInput, forceLanguage, forceContinuation },
      fallbackContext,
    )

  let draftAttempt = await runDraft()
  let providerResult = draftAttempt.result
  let usedFallback = draftAttempt.usedFallback
  let fallbackErrorCode = draftAttempt.errorCode
  let generatedDraft = finalizeWithGreeting(providerResult.text)
  let providerMeta = providerResult.providerMeta

  let forcedLanguageAttempted = false
  if (language === "de" && containsStrongEnglishSignals(generatedDraft)) {
    forcedLanguageAttempted = true
    draftAttempt = await runDraft(true)
    providerResult = draftAttempt.result
    usedFallback = draftAttempt.usedFallback
    fallbackErrorCode = draftAttempt.errorCode
    generatedDraft = finalizeWithGreeting(providerResult.text)
    providerMeta = providerResult.providerMeta
  }

  const shouldNormalizeGermanParentMessage =
    mode === "parent_message" &&
    (language?.toLowerCase().startsWith("de") || normalizedUiLocale?.toLowerCase().startsWith("de"))

  const applyGermanNormalization = (draft: string) => {
    if (!shouldNormalizeGermanParentMessage) {
      return draft
    }
    const germanNormalization = normalizeGermanParentMessage(draft)
    let normalizedText = germanNormalization.text
    if (germanNormalization.neutralized) {
      inputReframed = true
      if (!inputReframedTier) {
        inputReframedTier = "tier1"
        safetyFlags.add(`input-reframed-${inputReframedTier}`)
      }
    }
    const guarded = applyFinalGreetingGuard(normalizedText, finalGreetingLine)
    return removeDuplicateGreeting(guarded, finalGreetingLine)
  }

    if (shouldNormalizeGermanParentMessage) {
      generatedDraft = applyGermanNormalization(generatedDraft)
    }

    generatedDraft = ensureClosingAndSignature(generatedDraft, language, teacherSignatureName)
    const normalizedSignoffLanguage = (language?.toLowerCase() ?? "en")
    const fallbackSignatureName = normalizedSignoffLanguage.startsWith("de")
      ? FALLBACK_SIGNATURES.de
      : FALLBACK_SIGNATURES.en
    const finalSignatureName = (teacherSignatureName?.trim()) || fallbackSignatureName
    generatedDraft = ensureSingleSignOff(generatedDraft, finalSignatureName, normalizedSignoffLanguage)

    let formattedDraftStructure = formatDraftText(generatedDraft, language)
  let bodyParagraphCount = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
  let bodyWordCount = countWords(generatedDraft)
  const evaluateBodyNeedsRetry = () =>
    Boolean(
      finalGreetingLine &&
        (bodyWordCount < MIN_BODY_WORDS || bodyParagraphCount < MIN_BODY_PARAGRAPHS),
    )

  if (evaluateBodyNeedsRetry()) {
    const continuationAttempt = await runDraft(forcedLanguageAttempted, true)
    providerResult = continuationAttempt.result
    usedFallback = continuationAttempt.usedFallback
    fallbackErrorCode = continuationAttempt.errorCode
    providerMeta = providerResult.providerMeta
    generatedDraft = finalizeWithGreeting(providerResult.text)
    generatedDraft = applyGermanNormalization(generatedDraft)
    formattedDraftStructure = formatDraftText(generatedDraft, language)
    bodyParagraphCount = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
    bodyWordCount = countWords(generatedDraft)
    if (evaluateBodyNeedsRetry()) {
      const templateDraft = buildDeterministicTemplateBody(finalGreetingLine ?? "", language)
      const guardedTemplate = removeDuplicateGreeting(
        applyFinalGreetingGuard(templateDraft, finalGreetingLine),
        finalGreetingLine,
      )
      generatedDraft = guardedTemplate
      formattedDraftStructure = formatDraftText(generatedDraft, language)
      bodyParagraphCount = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
      bodyWordCount = countWords(generatedDraft)
      usedFallback = true
      fallbackErrorCode = fallbackErrorCode ?? "GREETING_BODY_FALLBACK"
      providerMeta = {
        modelUsed: "greeting-body-template",
        latencyMs: 0,
      }
    }
  }

  let rewriteAttempted = false
  const generationTime = providerMeta.latencyMs ?? Date.now() - generationStart

  const outputDetection = detectSensitiveContent(generatedDraft)
  outputDetection.matches.forEach((match) => safetyFlags.add(`output-${match.type}`))
  if (outputDetection.matches.length > 0 && detection.matches.length === 0) {
    logDraftOutcome("INVALID_REQUEST", { errorCode: "INVALID_REQUEST" })
    void recordDiagnostic({ lastErrorCode: "INVALID_REQUEST" })
    return fail(
      422,
      "INVALID_REQUEST",
      "Generated content included sensitive information that cannot be returned.",
      {
        data: {
          redactedPreview: outputDetection.sanitized,
        },
      },
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
  if (!isQaUser && !isDevBypassRequest) {
    try {
      updatedUsage = await incrementUsage(uid, firestore!, plan === "pro")
    } catch (error) {
      if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
        const usageLimitError = buildUsageLimitError(initialUsage)
        return fail(429, "USAGE_LIMIT_EXCEEDED", usageLimitError.message, {
          data: usageLimitError.data,
        })
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
    sanitizedInput: {
      wordCount: sanitizedInput.wordCount,
      substantiveLines: sanitizedInput.substantiveLines,
      nonEmptyLines: sanitizedInput.nonEmptyLines,
      removedLines: sanitizedInput.removedLines.length,
    },
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

  maybeLogServerEvent("draft_generation", {
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
  const usageAfterGeneration = buildUsageResponse(updatedUsage, plan, {
    unlimited: isQaUser || isDevBypassRequest,
  })
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
    maybeLogServerEvent("snippet_saved", { uid, snippetId })
  } catch (error) {
    console.error("[draft] Failed to persist snippet", error)
    maybeLogServerEvent("snippet_save_failed", { uid, error: (error as Error).message })
  }
  const diagnosticFields: Record<string, unknown> = {
    lastModelUsed: metadata.modelUsed,
    lastPronounPreference: pronounPreference,
    lastResolvedPronounPreference: resolvedPronounPreference,
    lastPronounResolutionReason: pronounResolution.reason,
    lastPronounResolutionSource: pronounResolution.source ?? null,
    lastInputReframed: inputReframed,
    lastInputReframedTier: inputReframedTier,
    lastErrorCode: null,
    lastUsage: usageAfterGeneration,
  }
  if (FieldValue) {
    diagnosticFields.lastRunAt = FieldValue.serverTimestamp()
  }
  void recordDiagnostic(diagnosticFields)
  if (userRef && FieldValue) {
    try {
      await userRef.set({ lastDiagnosticsRunAt: FieldValue.serverTimestamp() }, { merge: true })
    } catch (error) {
      console.error("[draft] Failed to update diagnostics timestamp on user doc", error)
    }
  }
  if (insightsSummaryRef && FieldValue) {
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
  }
  logDraftOutcome("SUCCESS", {
    latencyMs: generationTime,
    modelUsed: metadata.modelUsed,
    tokensUsed: providerMeta.tokensUsed,
  })

  return ok({
    generatedDraft,
    formattedDraft: formattedDraftStructure,
    greeting: responseGreeting,
    metadata,
    meta: responseMeta,
    usage: usageAfterGeneration,
    snippetId,
    deescalationSummary,
  })
  } catch (error) {
    console.error("[draft] Unexpected error", error)
    return fail(500, "INTERNAL", "An unexpected error occurred.")
  }
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

