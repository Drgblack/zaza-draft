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
import { extractBearerToken } from "@/lib/auth/bearer"
import { hasDraftEntitlementAccess, resolveDraftEntitlement } from "@/lib/draft-entitlements"
import {
  ALLOWED_TONES,
  buildFallbackDraft,
  buildTeacherNotesRecoveryDraft,
  DraftFallbackContext,
  generateDraftWithFallback,
  isSafeDraftTeacherNotesRecovery,
  LanguageKey,
  ProviderRequestInput,
  ToneKey,
} from "@/lib/draft/fallback"
import { isInternalQaUid, shouldRespectUsageLimit } from "@/lib/auth/internal-qa"
import { buildBlockedLanguageResponse } from "@/lib/draft/blocked-response"
import { enforceTeacherNameStyle } from "@/lib/draft/teacher-language"
import { formatDraftText, DraftStructure, CLOSING_REGEX } from "@/lib/draft/format"
import { evaluateEmotionalStructure } from "@/lib/draft/emotional-structure"
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
import { normalizeClosingBlock } from "@/lib/draft/ensure-single-signoff"
import { detectTeacherAuthenticityViolations, type TeacherAuthenticityViolation } from "@/lib/draft/teacher-authenticity"
import { sanitizeReportCommentStructure, sanitizeReportCommentText } from "@/lib/draft/report-comment"
import { applyModeAwareSubjectLine } from "@/lib/draft/subject-policy"
import { applyEnglishOutputSanity } from "@/lib/draft/english-output-sanity"
import { detectTeacherNoteIssueClusters } from "@/lib/draft/teacher-note-issues"
import { isValidDraftRequest, OUT_OF_SCOPE_REDIRECT_MESSAGE } from "./scope-guard"
import { isDebugEnabled } from "@/lib/debug"
import { classifyGenerationRequest, type GenerationMetadata, type SourceType } from "@/lib/generation/classification"
import { applyFinalGreetingGuard } from "@/lib/draft/final-greeting"
import {
  GreetingDecision,
  greetingWithName,
  normalizeParentFacingGreetingLine,
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
  voiceSessionId?: string
  inputMode?: GenerationMetadata["mode"]
  sourceType?: SourceType
  ocrConfidence?: number
  panicClassificationConfidence?: number
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

  return pieces.join(" ?f?'Ã¯Â¿Â½?,?s?f??s?,Ã¯Â¿Â½ ") + "."
}

const GENERIC_GREETING_TEXTS = new Set([
  "Liebe Eltern,",
  "Liebe Eltern",
  "Liebe Erziehungsberechtigte,",
  "Liebe Erziehungsberechtigte",
])

const EXTRA_SIGNOFF_PATTERNS = [/mit nachdruck/i]

const STRONG_ENGLISH_PATTERNS = [/Subject:/i, /\bDear\b/i, /\bKind regards\b/i, /\bBest regards\b/i, /\bThank you\b/i, /\bPlease\b/i]

interface GreetingPolicyOverrides {
  mode?: DraftMode
  direction?: GenerationMetadata["direction"]
  tone?: ToneKey
  messageType?: string
}

function detectTrailingName(raw: string, locale: GreetingLocale, policy: GreetingPolicyOverrides = {}) {
  if (policy.mode === "report_comment" || policy.direction === "report_comment") {
    return null
  }
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
      greeting: greetingWithName(locale, candidate, policy),
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
const MIN_PARENT_MESSAGE_MEANINGFUL_WORDS = 12
const MIN_PARENT_MESSAGE_PARAGRAPHS = 1
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
  if (!structure?.paragraphs?.length) {
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

function getMeaningfulParentBodyParagraphs(
  structure: DraftStructure,
  greetingLine?: string | null,
) {
  if (!structure?.paragraphs?.length) {
    return []
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
    if (CLOSING_REGEX.test(trimmed)) {
      return false
    }
    return true
  })
}

function getMeaningfulParentBodyWordCount(
  structure: DraftStructure,
  greetingLine?: string | null,
) {
  return getMeaningfulParentBodyParagraphs(structure, greetingLine)
    .join(" ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length
}

type RecoveryTraceSource =
  | "primary_generation"
  | "retry_generation"
  | "deterministic_fallback"
  | "continuation_recovery"

type RouteRecoveryIssueKind =
  | "bullying_safety"
  | "homework"
  | "lateness"
  | "grading"
  | "behaviour"
  | "disruption"
  | "support"
  | "general"

function detectRouteRecoveryIssueKind(source: string | undefined, language: string | undefined): RouteRecoveryIssueKind {
  const normalized = (source ?? "").toLowerCase()
  const isGerman = language?.toLowerCase().startsWith("de")
  const patterns = isGerman
    ? {
        bullying_safety:
          /\b(mobb|gemobbt|sicherheit|sicher|verletz|geschubst|geschlagen|angst|weinen|aufsicht|pause|vorfall)\b/,
        homework: /\b(hausaufgabe|hausaufgaben|nicht abgegeben|fehlende aufgabe|aufgabenmenge)\b/,
        lateness: /\b(spät|verspät|zu spät|pünktlich)\b/,
        grading: /\b(note|noten|bewertung|bewertet|test|prüfung|korrigiert)\b/,
        behaviour: /\b(verhalten|respektlos|unfreundlich|streit|konflikt)\b/,
        disruption: /\b(stört|unruh|reinruf|unterbr|ablenk|konzent|laut)\b/,
        support: /\b(unterstütz|hilfe|förder|zusätzliche hilfe|besprech)\b/,
      }
    : {
        bullying_safety:
          /\b(bully|bullying|unsafe|safety|hurt|pushed|hit|afraid|scared|crying|incident|breaktime|playground)\b/,
        homework:
          /\b(homework|missing work|not handed in|did not hand in|didn't hand in|worksheet|task load)\b/,
        lateness: /\b(late|lateness|tardy|punctual|arrival)\b/,
        grading: /\b(grade|grading|marking|marked|assessment|test score|exam)\b/,
        behaviour: /\b(behaviour|behavior|rude|unkind|argument|conflict)\b/,
        disruption: /\b(disrupt|disruption|calling out|talking over|interrupt|unsettled|focus)\b/,
        support: /\b(support|help|meeting|follow up|check in|plan)\b/,
      }

  if (patterns.bullying_safety.test(normalized)) return "bullying_safety"
  if (patterns.homework.test(normalized)) return "homework"
  if (patterns.lateness.test(normalized)) return "lateness"
  if (patterns.grading.test(normalized)) return "grading"
  if (patterns.behaviour.test(normalized)) return "behaviour"
  if (patterns.disruption.test(normalized)) return "disruption"
  if (patterns.support.test(normalized)) return "support"
  return "general"
}

function getRouteRecoveryAnchors(issueKind: RouteRecoveryIssueKind, language: string | undefined) {
  const isGerman = language?.toLowerCase().startsWith("de")
  if (isGerman) {
    const anchors: Record<RouteRecoveryIssueKind, string[]> = {
      bullying_safety: ["vorfall", "sicherheit", "pause", "aufsicht", "mobbing"],
      homework: ["hausaufgaben", "aufgaben", "fehlenden aufgaben"],
      lateness: ["pünktlichkeit", "zu spät", "unterrichtsbeginn"],
      grading: ["bewertung", "note", "test"],
      behaviour: ["verhalten", "konflikt", "umgang"],
      disruption: ["unterricht", "lernzeit", "unterrichtsverlauf"],
      support: ["unterstützung", "nächsten schritte", "rückmeldung"],
      general: ["unterricht", "rückmeldung", "nächsten schritte"],
    }
    return anchors[issueKind]
  }

  const anchors: Record<RouteRecoveryIssueKind, string[]> = {
    bullying_safety: ["incident", "safety", "break", "breaktime", "playground", "bullying"],
    homework: ["homework", "task", "work", "missing work"],
    lateness: ["lateness", "arrival", "punctuality", "start of lessons"],
    grading: ["marking", "grade", "assessment", "work"],
    behaviour: ["behaviour", "conflict", "classroom behaviour"],
    disruption: ["lesson", "class", "lesson time", "disruption"],
    support: ["support", "meeting", "follow up", "next steps"],
    general: ["school", "class", "update", "next steps"],
  }
  return anchors[issueKind]
}

function detectGenericRecoveryOutput(
  draft: string,
  sourceText: string | undefined,
  language: string | undefined,
  mode: DraftMode,
) {
  const normalizedDraft = draft.toLowerCase()
  const issueKind = detectRouteRecoveryIssueKind(sourceText, language)
  const anchors = getRouteRecoveryAnchors(issueKind, language)
  const mentionsAnchor = anchors.some((anchor) => normalizedDraft.includes(anchor))
  const genericPhrases = language?.toLowerCase().startsWith("de")
    ? [
        "danke für ihre nachricht",
        "ich werde den punkt weiter aufgreifen",
        "wenn danach eine weitere rückmeldung sinnvoll ist",
      ]
    : [
        "thank you for your message",
        "i will follow this up in school and keep the next steps clear and practical",
        "if a further update would be helpful once i have followed this up",
      ]

  const genericHits = genericPhrases.filter((phrase) => normalizedDraft.includes(phrase))
  const structuralLeak =
    mode === "report_comment" &&
    /^(subject|betreff):|^hello,|^guten tag,|kind regards|best regards|mit freundlichen grüßen/im.test(
      draft,
    )

  return {
    issueKind,
    templateFamily: `source_grounded_${issueKind}`,
    shouldRepair: structuralLeak || (genericHits.length > 0 && !mentionsAnchor),
    reason: structuralLeak ? "REPORT_COMMENT_STRUCTURE_LEAK" : "GENERIC_RECOVERY_OVERUSE",
  }
}

function buildDeterministicTemplateBody(
  greetingLine: string,
  language: string | undefined,
  fallbackContext: DraftFallbackContext,
) {
  const templateContext: DraftFallbackContext = {
    ...fallbackContext,
    language: language?.toLowerCase().startsWith("de") ? "de" : "en",
    greeting: greetingLine.trim() ? { text: greetingLine } : fallbackContext.greeting,
    greetingFinal: Boolean(greetingLine.trim()) || fallbackContext.greetingFinal,
  }

  if (isSafeDraftTeacherNotesRecovery(templateContext) && greetingLine.trim()) {
    const closingBlock = language?.toLowerCase().startsWith("de")
      ? "Mit freundlichen Grüßen"
      : "Kind regards,"
    return buildTeacherNotesRecoveryDraft(templateContext, greetingLine, closingBlock)
  }

  return buildFallbackDraft(templateContext)
}

type TrustGradeViolationType =
  | "MORAL_JUDGEMENT"
  | "ABSOLUTE_PROMISE"
  | "FABRICATED_PAST_ACTION"
  | "META_INSTRUCTION"

type TrustGradeLocale = "en" | "de"

interface TrustGradeViolation {
  type: TrustGradeViolationType
  phrase: string
  locale: TrustGradeLocale
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const TRUST_GRADE_PHRASE_MAP: Record<TrustGradeViolationType, Record<TrustGradeLocale, string[]>> = {
  MORAL_JUDGEMENT: {
    en: ["unacceptable", "inappropriate"],
    de: ["inakzeptabel", "unangemessen"],
  },
  ABSOLUTE_PROMISE: {
    en: ["never", "guarantee"],
    de: ["niemals", "garantier", "garantiert"],
  },
  FABRICATED_PAST_ACTION: {
    en: ["i spoke with", "we reviewed", "we have spoken"],
    de: ["ich habe mit", "wir haben gesprochen", "wir haben geprüft"],
  },
  META_INSTRUCTION: {
    en: ["you should", "teachers must"],
    de: ["sie sollten", "lehrer müssen"],
  },
}

const TRUST_GRADE_PATTERNS: Array<TrustGradeViolation & { pattern: RegExp }> = Object.entries(
  TRUST_GRADE_PHRASE_MAP,
 ).flatMap(([type, locales]) =>
  (["en", "de"] as TrustGradeLocale[]).flatMap((locale) =>
    (locales[locale] ?? []).map((phrase) => ({
      type: type as TrustGradeViolationType,
      phrase,
      locale,
      pattern: new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i"),
    })),
  ),
)

function detectTrustGradeViolations(text: string): TrustGradeViolation[] {
  return TRUST_GRADE_PATTERNS.filter((entry) => entry.pattern.test(text)).map(
    ({ pattern, ...violation }) => violation,
  )
}

function detectExtraSignoffName(raw: string, locale: GreetingLocale, policy: GreetingPolicyOverrides = {}) {
  if (policy.mode === "report_comment" || policy.direction === "report_comment") {
    return null
  }
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
          greeting: greetingWithName(locale, candidate, policy),
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

  function normalizeGreetingValue(value: string, locale: GreetingLocale = "en") {
    const normalized = normalizeName(value)
    if (!normalized) {
      return ""
    }
    return normalizeParentFacingGreetingLine(normalized, locale)
  }

function resolveGreetingFromRawText(
  raw: string,
  language: string | undefined,
  messageType?: string,
  mode?: DraftMode,
  direction?: GenerationMetadata["direction"],
  tone?: ToneKey,
  recipientOverride?: string | null,
) {
  const sanitized = sanitizeEmailText(raw)
  const cleaned = sanitized.cleanText.trim()
  const locale = language?.toLowerCase().startsWith("de") ? "de" : "en"
  if (cleaned) {
    const extraSignoff = detectExtraSignoffName(cleaned, locale, {
      mode,
      direction,
      tone,
      messageType,
    })
    if (extraSignoff) {
      return extraSignoff
    }
    const trailingName = detectTrailingName(cleaned, locale, {
      mode,
      direction,
      tone,
      messageType,
    })
    if (trailingName) {
      return trailingName
    }
  }
  const greetingResult = resolveGreeting({
    cleanedOcrText: cleaned,
    locale,
    messageType,
    mode,
    direction,
    tone,
    recipientOverride,
  })
  const normalizedGreeting = normalizeGreetingValue(greetingResult.greeting, locale)
    const normalizedSafeName = greetingResult.safeName
      ? normalizeName(greetingResult.safeName)
      : null
  return {
    greeting: normalizedGreeting || greetingResult.greeting,
    confidence: greetingResult.confidence,
    safeName: normalizedSafeName ?? null,
    source: greetingResult.source,
    final: Boolean(greetingResult.final && (normalizedGreeting || greetingResult.greeting)),
  }
}

function buildUsageLimitError(usage: ReturnType<typeof buildUsageResponse>, language?: string) {
  const isGerman = language?.toLowerCase().startsWith("de")
  const message = isGerman
    ? "Dein Gratis-Limit ist erreicht. Upgrade auf Draft Pro für unbegrenzte Entwürfe."
    : "You have reached your monthly draft limit. Upgrade to unlock Draft Pro for unlimited generations."
  return {
    message,
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
  generationMetadata: GenerationMetadata,
  forceLanguage?: boolean,
): Promise<ProviderResult | null> {
  try {
    return await generateDraft({
      situation: payload.situation,
      generationMetadata,
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

const DEBUG_DRAFT_LOGS = process.env.NODE_ENV !== "production" || process.env.DEBUG_DRAFT_LOGS === "1"

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
  const generationTrace = mode
    ? classifyGenerationRequest({
        draftMode: mode,
        locale: language,
        situation,
        requestedInputMode: payload.inputMode,
        requestedSourceType: payload.sourceType,
        messageType: payload.messageType ?? null,
        sourceConfidence: payload.ocrConfidence ?? null,
        hasScanId: Boolean(payload.scanId),
        hasVoiceSessionId: Boolean(payload.voiceSessionId),
      })
    : null

  let greetingText = normalizeGreetingValue(
    payload.greeting?.text ?? "",
    language?.toLowerCase().startsWith("de") ? "de" : "en",
  )
  let greetingConfidence = payload.greetingConfidence ?? payload.greeting?.confidence ?? "NONE"
  let greetingSource = payload.greetingSource ?? payload.greeting?.source ?? "generic-fallback"
  let greetingName = payload.greeting?.name ? normalizeName(payload.greeting.name) : null
  if (!greetingName) {
    greetingName = null
  }
  let greetingFinal = Boolean(payload.greetingFinal && greetingText)
  const greetingLocale: GreetingLocale = language?.toLowerCase().startsWith("de") ? "de" : "en"
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
    greetingFinal = false
  }

  if (!greetingText || shouldResetGreeting) {
    const resolvedGreeting = resolveGreetingFromRawText(
      payload.situationRaw ?? "",
      language,
      payload.messageType,
      mode ?? undefined,
      generationTrace?.metadata.direction,
      tone,
      greetingName,
    )
    if (resolvedGreeting) {
      greetingText = normalizeGreetingValue(resolvedGreeting.greeting, greetingLocale)
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

  if (!greetingFinal && greetingText && mode === "parent_message" && generationTrace?.metadata.direction !== "report_comment") {
    greetingFinal = true
  }

  const finalGreetingLine = greetingFinal ? greetingText : null
  if (payload.greetingFinal && !greetingText && debugEnabled) {
    DEBUG_DRAFT_LOGS && console.debug("[draft] greetingFinal was true but greeting text missing; ignoring final flag", {
      scanId: payload.scanId ?? null,
    })
  }
  const hasFinalGreeting = Boolean(finalGreetingLine)
  const greetingDecision: GreetingDecision = {
    greeting: greetingText,
    safeParentName: greetingName,
    confidence: greetingConfidence,
    source: greetingSource,
    locale: greetingLocale,
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
  if (!generationTrace) {
    return fail(500, "INTERNAL", "Unable to classify generation request.")
  }
  const generationMetadata = generationTrace.metadata

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
      "After removing Gmail UI noise, the note doesn?fÃ¯Â¿Â½Ã¯Â¿Â½??sÃ¯Â¿Â½Ã¯Â¿Â½??zÃ¯Â¿Â½t include enough detail to craft a responsible reply. Please describe the parent concern in at least 20 words.",
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
  DEBUG_DRAFT_LOGS && console.info("[draft] routing", {
    uidHash,
    mode: generationMetadata.mode,
    direction: generationMetadata.direction,
    source_type: generationMetadata.source_type,
    ocr_used: generationTrace.ocrUsed,
    transcript_used: generationTrace.transcriptUsed,
    prompt_builder: generationMetadata.prompt_builder,
  })
  const logDraftOutcome = (
    outcomeCode: string,
    extras: { latencyMs?: number; modelUsed?: string; tokensUsed?: number; errorCode?: string } = {},
  ) => {
    DEBUG_DRAFT_LOGS && console.info("[draft] generate outcome", {
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
  const localEntitlements = isDevBypassRequest ? devDefaults : await getUserEntitlements(uid, firestore!)
  if (!isDevBypassRequest) {
    const idToken = extractBearerToken(request)
    if (!idToken) {
      return fail(401, "UNAUTHORIZED", "Missing authorization token")
    }

    const draftEntitlement = await resolveDraftEntitlement({
      uid,
      firestore: firestore!,
      idToken,
      localEntitlements,
    })
    if (!hasDraftEntitlementAccess(draftEntitlement.entitlement)) {
      return fail(403, "NOT_ENTITLED", "Your Draft access is not active.")
    }
  }

  const entitlements = localEntitlements
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
    logDraftOutcome("RATE_LIMITED", { errorCode: "USAGE_LIMIT_EXCEEDED" })
    const usageLimitError = buildUsageLimitError(initialUsage, language)
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

  // Ensure snippet/audit context always carries requestId.
  ;(sanitizedContext as any).requestId = requestId
  // Omit undefined fields to keep contextUsed clean and deterministic in tests.
  if ((sanitizedContext as any).subject === undefined) delete (sanitizedContext as any).subject
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
    generationMetadata,
    originalSituation: originalSituationForPrompt,
    tone,
    language,
    context: sanitizedContext,
    rewrite: Boolean(payload.rewrite),
    previousDraft: payload.previousDraft,
    pronounPreference: resolvedPronounPreference,
    mode,
    studentFirstName: studentNameForPayload || undefined,
    teacherNoteIssueClusters:
      generationMetadata.mode === "safe_draft" &&
      generationMetadata.direction === "teacher_internal_notes"
        ? detectTeacherNoteIssueClusters(currentSituation, language)
        : undefined,
    resolvedPronounPreference,
    signatureBlock: resolvedSignature.block,
    teacherSignatureName,
    greeting: providerGreeting,
    greetingFinal: hasFinalGreeting,
    greetingConfidence: payload.greetingConfidence,
    greetingSource: payload.greetingSource,
    messageType: payload.messageType,
    scanId: payload.scanId,
    ocrConfidence: payload.ocrConfidence,
    panicClassificationConfidence: payload.panicClassificationConfidence,
    uiLocale: normalizedUiLocale,
  }
  const fallbackContext: DraftFallbackContext = {
    mode,
    tone,
    language,
    requestId,
    uidHash,
    generationMetadata,
    studentFirstName: studentNameForPayload || undefined,
    teacherNoteIssueClusters:
      generationMetadata.mode === "safe_draft" &&
      generationMetadata.direction === "teacher_internal_notes"
        ? detectTeacherNoteIssueClusters(currentSituation, language)
        : undefined,
    studentPronounPreference: resolvedPronounPreference,
    teacherSignatureName,
    greeting: providerGreeting,
    greetingFinal: hasFinalGreeting,
    sourceSituation: currentSituation,
  }
  const recoveryTrace: {
    finalSource: RecoveryTraceSource
    templateFamily: string | null
    triggerReasons: string[]
    events: Array<{
      source: RecoveryTraceSource
      reason: string
      templateFamily: string | null
    }>
  } = {
    finalSource: "primary_generation",
    templateFamily: null,
    triggerReasons: [],
    events: [],
  }
  const pushRecoveryEvent = (
    source: RecoveryTraceSource,
    reason: string,
    templateFamily: string | null = null,
  ) => {
    recoveryTrace.finalSource = source
    recoveryTrace.templateFamily = templateFamily
    recoveryTrace.triggerReasons.push(reason)
    recoveryTrace.events.push({ source, reason, templateFamily })
  }
  const buildSourceGroundedRecoveryDraft = (reason: string) => {
    // UX decision C: if recovery converges on a generic draft, replace it with a deterministic
    // source-grounded recovery built from the active input rather than surfacing the generic text
    // or failing with an opaque error.
    const issue = detectGenericRecoveryOutput(generatedDraft, currentSituation, language, mode)
    if (mode === "report_comment") {
      const issueKind = issue.issueKind
      const reportText = language?.toLowerCase().startsWith("de")
        ? {
            homework:
              "Arbeitet im Unterricht verlässlich mit und zeigt ein solides Verständnis. Sollte Hausaufgaben regelmäßiger abschließen, um die Lernfortschritte besser zu sichern.",
            lateness:
              "Arbeitet nach dem Unterrichtsbeginn konzentriert mit und beteiligt sich sachlich. Sollte pünktlicher erscheinen, um den Einstieg in die Lernphase sicherer zu nutzen.",
            behaviour:
              "Arbeitet in vielen Phasen konzentriert mit und beteiligt sich sachlich. Sollte im Umgang mit anderen noch konstanter ruhig und respektvoll bleiben.",
            disruption:
              "Bringt fachlich passende Beiträge ein und reagiert auf Rückmeldungen. Sollte die Lernzeit konstanter ruhig halten, um durchgehend konzentriert zu arbeiten.",
            bullying_safety:
              "Beschreibt belastende Situationen zunehmend klar und nimmt Rückmeldungen ernst auf. Arbeitet daran, Konflikte ruhig anzusprechen und sich in angespannten Momenten sicherer zu orientieren.",
            grading:
              "Arbeitet inhaltlich sicher und kann wesentliche Anforderungen erfüllen. Sollte Rückmeldungen zur Bewertung gezielter aufgreifen, um schriftliche Leistungen weiter zu schärfen.",
            support:
              "Arbeitet grundsätzlich mit und nutzt Unterstützung zunehmend zielgerichtet. Benötigt weiterhin klare Hilfen und verlässliche Strukturen, um selbstständiger zu arbeiten.",
            general:
              "Zeigt in mehreren Bereichen eine stabile Entwicklung und arbeitet zunehmend sicherer mit. Sollte die nächsten Lernschritte weiterhin verlässlich und konzentriert umsetzen.",
          }
        : {
            homework:
              "Works steadily in class and shows sound understanding of the material. Should complete homework more regularly so that learning is reinforced consistently.",
            lateness:
              "Works productively once lessons begin and contributes appropriately. Should arrive more punctually so that the start of learning time is used well.",
            behaviour:
              "Contributes appropriately in many parts of the day and responds to guidance. Should be more consistently calm and respectful in interactions with others.",
            disruption:
              "Makes relevant contributions and responds to guidance. Should keep lesson time calmer so that concentration is sustained more consistently.",
            bullying_safety:
              "Describes difficult situations with growing clarity and responds thoughtfully to support. Is working on raising concerns calmly and feeling more secure in challenging moments.",
            grading:
              "Meets key assessment expectations and shows secure understanding. Should use feedback on marked work more consistently to sharpen written responses.",
            support:
              "Engages with support and is beginning to work with greater independence. Would benefit from clear routines and continued guidance to strengthen independent work.",
            general:
              "Shows steady development across several areas and is working with greater consistency. Should continue to develop concentration and consistency in day-to-day work.",
          }
      generatedDraft = reportText[issueKind]
      finalizeAndFormatDraft(generatedDraft)
      usedFallback = true
      fallbackErrorCode = fallbackErrorCode ?? reason
      providerMeta = {
        modelUsed: "source-grounded-report-recovery",
        latencyMs: providerMeta.latencyMs,
      }
      pushRecoveryEvent("deterministic_fallback", reason, issue.templateFamily)
      return
    }

    const templateGreeting =
      finalGreetingLine || (language?.toLowerCase().startsWith("de") ? "Guten Tag," : "Hello,")
    generatedDraft = removeDuplicateGreeting(
      applyFinalGreetingGuard(
        buildDeterministicTemplateBody(templateGreeting, language, fallbackContext),
        templateGreeting,
      ),
      templateGreeting,
    )
    finalizeAndFormatDraft(generatedDraft)
    usedFallback = true
    fallbackErrorCode = fallbackErrorCode ?? reason
    providerMeta = {
      modelUsed: "source-grounded-recovery",
      latencyMs: providerMeta.latencyMs,
    }
    pushRecoveryEvent("deterministic_fallback", reason, issue.templateFamily)
  }
  const finalizeDraft = (text: string) => {
    let curated = enforcePronouns(text, resolvedPronounPreference)
    curated = enforceTeacherNameStyle(curated, {
      firstName: studentNameForPayload || undefined,
      pronounPreference: resolvedPronounPreference,
      resolvedPronounPreference: resolvedPronounPreference,
    })
    curated = applyFinalGreetingGuard(curated, finalGreetingLine)
    if (mode === "report_comment") {
      curated = sanitizeReportCommentText(curated)
    }
    return curated
  }
  const FALLBACK_SIGNATURES = {
    en: "Your child's teacher",
    de: "Ihre Klassenlehrkraft",
  }
  const normalizeClosingForMode = (text: string) =>
    normalizeClosingBlock(text, {
      locale: language,
      omit: mode === "report_comment" || !resolvedSignature.appendForMode[mode],
      signatureLines: resolvedSignature.lines,
      fallbackName: language?.toLowerCase().startsWith("de")
        ? FALLBACK_SIGNATURES.de
        : FALLBACK_SIGNATURES.en,
    })
  const finalizeDraftWithSignature = (text: string) =>
    normalizeClosingForMode(applySignatureToDraft(finalizeDraft(text), resolvedSignature, mode))
  const finalizeWithGreeting = (text: string) =>
    removeDuplicateGreeting(finalizeDraftWithSignature(text), finalGreetingLine)
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
  if (usedFallback) {
    pushRecoveryEvent(
      "deterministic_fallback",
      fallbackErrorCode ?? "PROVIDER_FALLBACK",
      draftAttempt.recoveryMeta?.templateFamily ?? null,
    )
  }

  let forcedLanguageAttempted = false
  if (language === "de" && containsStrongEnglishSignals(generatedDraft)) {
    forcedLanguageAttempted = true
    draftAttempt = await runDraft(true)
    providerResult = draftAttempt.result
    usedFallback = draftAttempt.usedFallback
    fallbackErrorCode = draftAttempt.errorCode
    generatedDraft = finalizeWithGreeting(providerResult.text)
    providerMeta = providerResult.providerMeta
    pushRecoveryEvent(
      usedFallback ? "deterministic_fallback" : "retry_generation",
      "FORCED_LANGUAGE_RETRY",
      draftAttempt.recoveryMeta?.templateFamily ?? null,
    )
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

  let formattedDraftStructure: DraftStructure = formatDraftText(generatedDraft, language)
  let bodyParagraphCount: number = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
  let bodyWordCount: number = getMeaningfulParentBodyWordCount(formattedDraftStructure, finalGreetingLine)

  const finalizeAndFormatDraft = (draftText?: string) => {
    if (draftText) {
      generatedDraft = draftText
    }
    if (shouldNormalizeGermanParentMessage) {
      generatedDraft = applyGermanNormalization(generatedDraft)
    }
    generatedDraft = normalizeClosingForMode(generatedDraft)
    generatedDraft = applyModeAwareSubjectLine(generatedDraft, {
      mode,
      language,
      generationMode: generationMetadata.mode,
      messageType: payload.messageType ?? undefined,
      studentFirstName: studentNameForPayload || undefined,
      situation: payload.situation,
      contextSubject: payload.context?.subject,
    })
    const finalSanity = applyEnglishOutputSanity(generatedDraft, {
      language,
      mode,
      studentFirstName: studentNameForPayload || undefined,
    })
    generatedDraft = finalSanity.text
    generatedDraft = normalizeClosingForMode(generatedDraft)
    formattedDraftStructure =
      mode === "report_comment"
        ? sanitizeReportCommentStructure(formatDraftText(generatedDraft, language), language)
        : formatDraftText(generatedDraft, language)
    bodyParagraphCount = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
    bodyWordCount =
      mode === "parent_message"
        ? getMeaningfulParentBodyWordCount(formattedDraftStructure, finalGreetingLine)
        : countWords(generatedDraft)
  }

  const enforceFinalVisibleSignoff = () => {
    if (mode === "report_comment") {
      formattedDraftStructure = sanitizeReportCommentStructure(
        formatDraftText(generatedDraft, language),
        language,
      )
      bodyParagraphCount = getParagraphCountExcludingGreeting(
        formattedDraftStructure,
        finalGreetingLine,
      )
      bodyWordCount = countWords(generatedDraft)
      return
    }

    if (mode !== "parent_message" || !resolvedSignature.appendForMode[mode]) {
      return
    }

    generatedDraft = normalizeClosingForMode(generatedDraft)
    formattedDraftStructure = formatDraftText(generatedDraft, language)
    bodyParagraphCount = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
    bodyWordCount = getMeaningfulParentBodyWordCount(formattedDraftStructure, finalGreetingLine)
  }

  finalizeAndFormatDraft(generatedDraft)
  const shouldUseGreetingRecoveryTemplate = Boolean(finalGreetingLine && greetingSource === "resolved-name")
  const evaluateBodyNeedsRetry = () =>
    Boolean(
      shouldUseGreetingRecoveryTemplate &&
        (bodyWordCount < MIN_BODY_WORDS || bodyParagraphCount < MIN_BODY_PARAGRAPHS),
    )

  const hasMinimumParentMessageOutput = () =>
    mode !== "parent_message" ||
    (bodyParagraphCount >= MIN_PARENT_MESSAGE_PARAGRAPHS &&
      bodyWordCount >= MIN_PARENT_MESSAGE_MEANINGFUL_WORDS)

  const recoverCollapsedParentMessageOutput = async () => {
    if (mode !== "parent_message" || hasMinimumParentMessageOutput()) {
      return
    }

    const continuationAttempt = await runDraft(forcedLanguageAttempted, true)
    providerResult = continuationAttempt.result
    usedFallback = continuationAttempt.usedFallback
    fallbackErrorCode = continuationAttempt.errorCode ?? fallbackErrorCode ?? "MIN_OUTPUT_RECOVERY_RETRY"
    providerMeta = providerResult.providerMeta
    generatedDraft = finalizeWithGreeting(providerResult.text)
    finalizeAndFormatDraft(generatedDraft)
    pushRecoveryEvent(
      usedFallback ? "deterministic_fallback" : "continuation_recovery",
      "MIN_OUTPUT_RECOVERY_RETRY",
      continuationAttempt.recoveryMeta?.templateFamily ?? null,
    )

    if (hasMinimumParentMessageOutput()) {
      return
    }

    generatedDraft = finalizeWithGreeting(buildFallbackDraft(fallbackContext))
    finalizeAndFormatDraft(generatedDraft)
    providerMeta = {
      modelUsed: "minimum-output-fallback",
      latencyMs: providerMeta.latencyMs,
    }
    usedFallback = true
    fallbackErrorCode = fallbackErrorCode ?? "MIN_OUTPUT_FALLBACK"
    pushRecoveryEvent("deterministic_fallback", "MIN_OUTPUT_FALLBACK")

    if (hasMinimumParentMessageOutput()) {
      return
    }

    const templateGreeting =
      finalGreetingLine ||
      (language?.toLowerCase().startsWith("de") ? "Guten Tag," : "Hello,")
    generatedDraft = removeDuplicateGreeting(
      applyFinalGreetingGuard(
        buildDeterministicTemplateBody(templateGreeting, language, fallbackContext),
        templateGreeting,
      ),
      templateGreeting,
    )
    finalizeAndFormatDraft(generatedDraft)
    providerMeta = {
      modelUsed: "minimum-output-template",
      latencyMs: providerMeta.latencyMs,
    }
    usedFallback = true
    fallbackErrorCode = fallbackErrorCode ?? "MIN_OUTPUT_TEMPLATE"
    pushRecoveryEvent("deterministic_fallback", "MIN_OUTPUT_TEMPLATE")
  }
  const applyGenericRecoveryGuardIfNeeded = () => {
    const genericRecovery = detectGenericRecoveryOutput(
      generatedDraft,
      currentSituation,
      language,
      mode,
    )
    if (!genericRecovery.shouldRepair) {
      return
    }
    buildSourceGroundedRecoveryDraft(genericRecovery.reason)
  }

  if (evaluateBodyNeedsRetry()) {
    const continuationAttempt = await runDraft(forcedLanguageAttempted, true)
    providerResult = continuationAttempt.result
    usedFallback = continuationAttempt.usedFallback
    fallbackErrorCode = continuationAttempt.errorCode
    providerMeta = providerResult.providerMeta
    generatedDraft = finalizeWithGreeting(providerResult.text)
    finalizeAndFormatDraft(generatedDraft)
    pushRecoveryEvent(
      usedFallback ? "deterministic_fallback" : "continuation_recovery",
      "GREETING_BODY_RETRY",
      continuationAttempt.recoveryMeta?.templateFamily ?? null,
    )
    if (evaluateBodyNeedsRetry()) {
      const templateDraft = buildDeterministicTemplateBody(
        finalGreetingLine ?? "",
        language,
        fallbackContext,
      )
      const guardedTemplate = removeDuplicateGreeting(
        applyFinalGreetingGuard(templateDraft, finalGreetingLine),
        finalGreetingLine,
      )
      generatedDraft = guardedTemplate
      finalizeAndFormatDraft(generatedDraft)
      usedFallback = true
      fallbackErrorCode = fallbackErrorCode ?? "GREETING_BODY_FALLBACK"
      providerMeta = {
        modelUsed: "greeting-body-template",
        latencyMs: 0,
      }
      pushRecoveryEvent("deterministic_fallback", "GREETING_BODY_FALLBACK")
    }
  }

  let trustGradeViolations = detectTrustGradeViolations(generatedDraft)
  let trustGradeRegenerationAttempted = false

  const attemptTrustGradeRegeneration = async (currentViolations: TrustGradeViolation[]) => {
    if (trustGradeRegenerationAttempted || currentViolations.length === 0) {
      return currentViolations
    }
    trustGradeRegenerationAttempted = true
    const violationTypes = Array.from(new Set(currentViolations.map((violation) => violation.type)))
    const violationPhrases = currentViolations.map((violation) => violation.phrase)
    providerInput.trustGradeViolations = {
      types: violationTypes,
      phrases: violationPhrases,
    }
    const regenerationAttempt = await runDraft(forcedLanguageAttempted)
    providerResult = regenerationAttempt.result
    usedFallback = regenerationAttempt.usedFallback
    fallbackErrorCode = regenerationAttempt.errorCode
    generatedDraft = finalizeWithGreeting(providerResult.text)
    providerMeta = providerResult.providerMeta
    finalizeAndFormatDraft(generatedDraft)
    providerInput.trustGradeViolations = undefined
    pushRecoveryEvent(
      usedFallback ? "deterministic_fallback" : "retry_generation",
      "TRUST_GRADE_RETRY",
      regenerationAttempt.recoveryMeta?.templateFamily ?? null,
    )
    return detectTrustGradeViolations(generatedDraft)
  }

  if (trustGradeViolations.length > 0) {
    trustGradeViolations = await attemptTrustGradeRegeneration(trustGradeViolations)
  }
  if (trustGradeViolations.length > 0) {
    safetyFlags.add("output-trust-grade-violation")
    logDraftOutcome("INVALID_REQUEST", { errorCode: "TRUST_GRADE_VIOLATION" })
    void recordDiagnostic({ lastErrorCode: "TRUST_GRADE_VIOLATION" })
    return fail(
      422,
      "TRUST_GRADE_VIOLATION",
      "Unable to generate a compliant draft. Please rephrase or contact support.",
      {
        data: {
          violations: trustGradeViolations,
        },
      },
    )
  }

  let teacherAuthenticityViolations = detectTeacherAuthenticityViolations(generatedDraft, {
    language,
    mode,
    direction: generationMetadata.direction,
    sourceText: currentSituation,
    studentFirstName: studentNameForPayload || undefined,
    teacherNoteIssueClusters: fallbackContext.teacherNoteIssueClusters,
  })
  let teacherAuthenticityRegenerationAttempted = false

  const attemptTeacherAuthenticityRegeneration = async (
    currentViolations: TeacherAuthenticityViolation[],
  ) => {
    if (teacherAuthenticityRegenerationAttempted || currentViolations.length === 0) {
      return currentViolations
    }

    teacherAuthenticityRegenerationAttempted = true
    providerInput.teacherAuthenticityViolations = {
      types: Array.from(new Set(currentViolations.map((violation) => violation.type))),
      phrases: currentViolations.map((violation) => violation.phrase),
    }
    const regenerationAttempt = await runDraft(forcedLanguageAttempted)
    providerResult = regenerationAttempt.result
    usedFallback = regenerationAttempt.usedFallback
    fallbackErrorCode = regenerationAttempt.errorCode
    generatedDraft = finalizeWithGreeting(providerResult.text)
    providerMeta = providerResult.providerMeta
    finalizeAndFormatDraft(generatedDraft)
    providerInput.teacherAuthenticityViolations = undefined
    pushRecoveryEvent(
      usedFallback ? "deterministic_fallback" : "retry_generation",
      "TEACHER_AUTHENTICITY_RETRY",
      regenerationAttempt.recoveryMeta?.templateFamily ?? null,
    )

    return detectTeacherAuthenticityViolations(generatedDraft, {
      language,
      mode,
      direction: generationMetadata.direction,
      sourceText: currentSituation,
      studentFirstName: studentNameForPayload || undefined,
      teacherNoteIssueClusters: fallbackContext.teacherNoteIssueClusters,
    })
  }

  if (teacherAuthenticityViolations.length > 0) {
    teacherAuthenticityViolations = await attemptTeacherAuthenticityRegeneration(
      teacherAuthenticityViolations,
    )
  }

  if (teacherAuthenticityViolations.length > 0) {
    const fallbackDraft = finalizeWithGreeting(buildFallbackDraft(fallbackContext))
    const fallbackViolations = detectTeacherAuthenticityViolations(fallbackDraft, {
      language,
      mode,
      direction: generationMetadata.direction,
      sourceText: currentSituation,
      studentFirstName: studentNameForPayload || undefined,
      teacherNoteIssueClusters: fallbackContext.teacherNoteIssueClusters,
    })

    if (fallbackViolations.length === 0) {
      generatedDraft = fallbackDraft
      finalizeAndFormatDraft(generatedDraft)
      providerMeta = {
        modelUsed: "teacher-style-fallback",
        latencyMs: providerMeta.latencyMs,
      }
      usedFallback = true
      fallbackErrorCode = fallbackErrorCode ?? "TEACHER_STYLE_FALLBACK"
      teacherAuthenticityViolations = []
      pushRecoveryEvent("deterministic_fallback", "TEACHER_STYLE_FALLBACK")
    }
  }

  if (teacherAuthenticityViolations.length > 0) {
    safetyFlags.add("output-generic-teacher-language")
  }

  await recoverCollapsedParentMessageOutput()
  applyGenericRecoveryGuardIfNeeded()

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
        generationMetadata,
        forcedLanguageAttempted,
      )
      if (rewriteResult) {
        generatedDraft = finalizeDraftWithSignature(rewriteResult.text)
        providerMeta = rewriteResult.providerMeta
        finalizeAndFormatDraft(generatedDraft)
        blockedDetection = detectBlockedLanguage(generatedDraft)
        pushRecoveryEvent("retry_generation", "BLOCKED_LANGUAGE_REWRITE")
      }
    }
  }

  if (blockedDetection.detected) {
    return handleBlockedOutput()
  }

  await recoverCollapsedParentMessageOutput()
  applyGenericRecoveryGuardIfNeeded()
  enforceFinalVisibleSignoff()

  let updatedUsage: MonthlyUsageRecord = usageRecord
  if (!isQaUser && !isDevBypassRequest) {
    try {
      updatedUsage = await incrementUsage(uid, firestore!, plan === "pro")
    } catch (error) {
      if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
        const usageLimitError = buildUsageLimitError(initialUsage, language)
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
    recovery:
      process.env.NODE_ENV !== "production" || debugEnabled
        ? {
            finalSource: recoveryTrace.finalSource,
            templateFamily: recoveryTrace.templateFamily,
            triggerReasons: Array.from(new Set(recoveryTrace.triggerReasons)),
            events: recoveryTrace.events,
          }
        : undefined,
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
    generationMode: generationMetadata.mode,
    messageDirection: generationMetadata.direction,
    sourceType: generationMetadata.source_type,
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
  DEBUG_DRAFT_LOGS && console.info("[draft] usage", {
    uid,
    isQaUser,
    isProUser: isProSubscriber,
    usageBefore: initialUsage.currentMonthUsage,
    usageAfter: updatedUsage.generationCount,
    unlimitedFlag: usageAfterGeneration.unlimited,
  })
  DEBUG_DRAFT_LOGS && console.info("[draft] recovery", {
    requestId,
    finalSource: recoveryTrace.finalSource,
    templateFamily: recoveryTrace.templateFamily,
    triggerReasons: Array.from(new Set(recoveryTrace.triggerReasons)),
    events: recoveryTrace.events,
  })

  const snippetPayload = {
    generatedText: generatedDraft,
    tone,
    language,
    pronounPreference,
    pronounResolution: metadata.pronounResolution,
    contextUsed: sanitizedContext,
    mode,
    generationMode: generationMetadata.mode,
    messageDirection: generationMetadata.direction,
    sourceType: generationMetadata.source_type,
    promptBuilder: generationMetadata.prompt_builder,
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
    recoverySource: recoveryTrace.finalSource,
    recoveryTemplateFamily: recoveryTrace.templateFamily,
    recoveryReasons: Array.from(new Set(recoveryTrace.triggerReasons)),
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
    lastGenerationMode: generationMetadata.mode,
    lastMessageDirection: generationMetadata.direction,
    lastSourceType: generationMetadata.source_type,
    lastPronounPreference: pronounPreference,
    lastResolvedPronounPreference: resolvedPronounPreference,
    lastPronounResolutionReason: pronounResolution.reason,
    lastPronounResolutionSource: pronounResolution.source ?? null,
    lastInputReframed: inputReframed,
    lastInputReframedTier: inputReframedTier,
    lastRecoverySource: recoveryTrace.finalSource,
    lastRecoveryTemplateFamily: recoveryTrace.templateFamily,
    lastRecoveryReasons: Array.from(new Set(recoveryTrace.triggerReasons)),
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

