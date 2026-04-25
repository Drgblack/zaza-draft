import { NextResponse } from "next/server"
import {
  detectSensitiveContent,
  detectBlockedLanguage,
  reframeBlockedLanguage,
  BlockedLanguageTier,
} from "@/lib/safety"
import type { DraftLanguage, DraftMode, PronounPreference } from "@/lib/types"
import {
  generateDraft,
  getConfiguredModelNames,
  ProviderMeta,
  ProviderResult,
} from "@/lib/ai/provider"
import { enforcePronouns, inferPronounResolution } from "@/lib/text/pronouns"
import { enforceDraftRateLimit, RateLimitError } from "@/lib/rate-limit"
import { createHash, randomUUID } from "crypto"
import { resolveDraftMode } from "@/lib/draft-mode"
import {
  buildUsageResponse,
  FREE_TIER_LIMIT,
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
  buildSourceGroundedTeacherDraftFallbackResult,
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
import {
  formatDraftText,
  DraftStructure,
  CLOSING_REGEX,
  extractTrailingClosingBlock,
} from "@/lib/draft/format"
import { evaluateEmotionalStructure } from "@/lib/draft/emotional-structure"
import { cleanStudentName } from "@/lib/draft/student-name"
import { normalizeGermanParentMessage } from "@/lib/draft/german-normalizer"
import { detectHighEmotionPhrases } from "@/lib/deescalation/detect"
import { rewriteHighEmotionText } from "@/lib/deescalation/rewrite"
import type { DeescalationSummary } from "@/lib/deescalation/types"
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
import {
  buildGenerationTraceFromInputIntent,
  classifyGenerationRequest,
  type GenerationMetadata,
  type InputIntent,
  type ParentMessageInputType,
  type SourceType,
} from "@/lib/generation/classification"
import { applyFinalGreetingGuard } from "@/lib/draft/final-greeting"
import { resolveTeacherDraftFeedback } from "@/lib/draft/teacher-draft-feedback"
import { runSafetyEngine, type SafetyEngineOutput } from "@/src/lib/safetyEngine"
import { detectTopicKeyword } from "@/src/lib/safetyEngine/topicDetector"
import { classifyTeacherIntent } from "@/lib/teacher-intent"
import {
  GreetingDecision,
  greetingWithName,
  normalizeParentFacingGreetingLine,
  summarizeRecipientName,
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
const INPUT_INTENTS: InputIntent[] = ["parent_message", "teacher_draft"]

function parsePronounPreference(value: unknown): PronounPreference {
  if (typeof value === "string" && PRONOUN_PREFERENCE_VALUES.includes(value as PronounPreference)) {
    return value as PronounPreference
  }
  return "auto"
}

function parseInputIntent(value: unknown): InputIntent | null {
  if (typeof value === "string" && INPUT_INTENTS.includes(value as InputIntent)) {
    return value as InputIntent
  }
  return null
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
  forwardSafeRewrite?: boolean
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
  inputIntent?: InputIntent
  parentMessageInputType?: ParentMessageInputType
  sourceType?: SourceType
  ocrConfidence?: number
  panicClassificationConfidence?: number
  documentationMode?: boolean
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

  return pieces.join(" | ") + "."
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
    const recipient = summarizeRecipientName(candidate, locale)
    return {
      greeting: greetingWithName(locale, candidate, policy),
      confidence: score.level,
      safeName: candidate,
      recipientTitle: recipient.title,
      recipientSurname: recipient.surname,
      recipientDisplayName: recipient.displayName,
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

const SHORT_ACCUSATORY_TEACHER_NOTE_PATTERNS = [
  /\byour child is lying\b/i,
  /\bhe is making excuses\b/i,
  /\bshe is being manipulative\b/i,
  /\byour son is twisting the story\b/i,
  /\byour daughter is twisting the story\b/i,
  /\bliar\b/i,
  /\blying\b/i,
  /\bmaking excuses\b/i,
  /\bmanipulative\b/i,
  /\btwisting the story\b/i,
]

function isSafeDraftTeacherNoteRequest(generationMetadata: GenerationMetadata, mode: DraftMode) {
  return (
    mode === "parent_message" &&
    generationMetadata.mode === "safe_draft" &&
    generationMetadata.direction === "teacher_internal_notes"
  )
}

function isReplyParsingRequest(generationMetadata: GenerationMetadata, mode: DraftMode) {
  return mode === "parent_message" && generationMetadata.direction === "parent_to_teacher"
}

function isVoiceToCalmRequest(generationMetadata: GenerationMetadata, mode: DraftMode) {
  return mode === "parent_message" && generationMetadata.mode === "voice_to_calm"
}

function hasShortAccusatoryTeacherNoteSignals(
  text: string,
  safetyAnalysis: SafetyEngineOutput | null,
) {
  const normalized = text.trim()
  if (
    safetyAnalysis?.triggeredSignals.some(
      (signal) =>
        signal.category === "accusation" ||
        signal.category === "negative_generalisation" ||
        signal.category === "prescriptive_demand",
    )
  ) {
    return true
  }

  return SHORT_ACCUSATORY_TEACHER_NOTE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function buildInsufficientInputMessage(options: {
  generationMetadata: GenerationMetadata
  mode: DraftMode
  text: string
  safetyAnalysis: SafetyEngineOutput | null
}) {
  const { generationMetadata, mode, text, safetyAnalysis } = options

  if (isSafeDraftTeacherNoteRequest(generationMetadata, mode)) {
    if (hasShortAccusatoryTeacherNoteSignals(text, safetyAnalysis)) {
      return "This note is too accusatory to turn into a parent message safely. Describe what you observed or what was said, avoid labels and motive attribution, and include at least one concrete incident or observable fact."
    }

    return "This note does not include enough observable detail for Draft to rewrite safely. Describe what you observed or what was said, and include at least one concrete incident or next step."
  }

  if (isReplyParsingRequest(generationMetadata, mode)) {
    return "After removing Gmail UI noise, the note doesn't include enough detail to craft a responsible reply. Please describe the parent concern in at least 20 words."
  }

  if (isVoiceToCalmRequest(generationMetadata, mode)) {
    return "This note is too short for Draft to calm into a clear teacher message. Add what happened, what you observed, and the next step you want to communicate."
  }

  return "This note does not include enough detail for Draft to continue safely. Add at least one concrete fact, observation, or next step."
}

function resolveDocumentationTopicLabel(
  rawMessage: string,
  safetyAnalysis: SafetyEngineOutput | null,
) {
  const sanitizeDocumentationTopic = (topic: string) => {
    const normalized = topic.trim().toLowerCase()
    if (["adhd", "add", "autism", "dyslexia", "sen", "learning difficulty"].includes(normalized)) {
      return "learning and attention needs"
    }
    return topic
  }

  const keyword = detectTopicKeyword(rawMessage)
  if (keyword) {
    return sanitizeDocumentationTopic(keyword)
  }

  const escalationSignal = safetyAnalysis?.triggeredSignals.find(
    (signal) => signal.category === "escalation",
  )
  if (escalationSignal) {
    return sanitizeDocumentationTopic(escalationSignal.label)
  }

  const labelAttachmentSignal = safetyAnalysis?.triggeredSignals.find(
    (signal) => signal.id === "acc_label_attachment",
  )
  if (labelAttachmentSignal) {
    return sanitizeDocumentationTopic(labelAttachmentSignal.label)
  }

  return null
}

function normalizeSignatureBlockForComparison(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? ""
}

const TEACHER_SIGNATURE_ROLE_ONLY_TOKENS = new Set([
  "dad",
  "mum",
  "mom",
  "mother",
  "father",
  "parent",
  "carer",
  "guardian",
  "family",
  "teacher",
  "staff",
])

function isTeacherDraftSignatureNameCandidate(value: string, language: DraftLanguage) {
  const normalized = normalizeName(value)
  if (!normalized) {
    return false
  }

  if (normalized.includes("'s") || normalized.includes("’s")) {
    return false
  }

  if (/\b(dad|mum|mom|mother|father|parent|carer|guardian|family)\b/i.test(normalized)) {
    return false
  }

  if (scoreSafeName(normalized, language).level !== "NONE") {
    return true
  }

  const tokens = normalized.split(/\s+/).filter(Boolean)
  if (tokens.length !== 1) {
    return false
  }

  const token = tokens[0]
  if (!/^[A-ZÄÖÜ][\p{L}'’-]+$/u.test(token)) {
    return false
  }

  return !TEACHER_SIGNATURE_ROLE_ONLY_TOKENS.has(token.toLowerCase())
}

function extractTeacherDraftSignatureLines(sourceDraft: string, language: DraftLanguage) {
  const closingBlock = extractTrailingClosingBlock(sourceDraft).closingBlock
  if (!closingBlock) {
    return []
  }

  const lines = closingBlock
    .split("\n")
    .map((line) => normalizeName(line))
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const signatureLines = lines.slice(1)
  const signatureName = signatureLines.at(-1)
  if (!signatureName || !isTeacherDraftSignatureNameCandidate(signatureName, language)) {
    return []
  }

  return signatureLines
}

function extractTeacherDraftSignatureName(sourceDraft: string, language: DraftLanguage) {
  return extractTeacherDraftSignatureLines(sourceDraft, language).at(-1)
}

function extractSignatureLinesForComparison(text: string) {
  const closingBlock = extractTrailingClosingBlock(text).closingBlock
  if (!closingBlock) {
    return []
  }

  return closingBlock
    .split("\n")
    .slice(1)
    .map((line) => normalizeName(line))
    .filter(Boolean)
}

function normalizeSignatureLinesForComparison(lines: string[]) {
  return lines
    .map((line) => line.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean)
    .join("\n")
}

function preserveTeacherDraftSignature(
  sourceDraft: string,
  candidateDraft: string,
  language: DraftLanguage,
) {
  const sourceClosing = extractTrailingClosingBlock(sourceDraft)
  if (!sourceClosing.closingBlock) {
    return candidateDraft
  }

  const signatureLines = extractTeacherDraftSignatureLines(sourceDraft, language)
  if (signatureLines.length === 0) {
    return candidateDraft
  }

  const candidateClosing = extractTrailingClosingBlock(candidateDraft)
  if (
    normalizeSignatureBlockForComparison(candidateClosing.closingBlock) ===
    normalizeSignatureBlockForComparison(sourceClosing.closingBlock)
  ) {
    return candidateDraft
  }

  const nextBody = candidateClosing.body.trimEnd()
  if (!nextBody) {
    return normalizeClosingBlock(sourceClosing.closingBlock, {
      locale: language,
      omit: false,
      signatureLines,
      fallbackName: language === "de" ? "Ihre Klassenlehrkraft" : "Your child's teacher",
    })
  }

  return normalizeClosingBlock(`${nextBody}\n\n${sourceClosing.closingBlock}`, {
    locale: language,
    omit: false,
    signatureLines,
    fallbackName: language === "de" ? "Ihre Klassenlehrkraft" : "Your child's teacher",
  })
}

type TeacherDraftQualityViolationType =
  | "DEFENSIVE_PHRASE"
  | "GENERIC_FILLER"
  | "INVENTED_PROCESS"
  | "FABRICATION"
  | "SIGNOFF_CHANGE"
  | "MISSING_ACKNOWLEDGEMENT"

type TeacherDraftQualityViolation = {
  type: TeacherDraftQualityViolationType
  phrase: string
}

function hasTeacherDraftAcknowledgementNeed(text: string) {
  return /\b(concern|concerns|upset|uncomfortable|worried|worrying|overwhelmed|distress|concerned)\b/i.test(
    text,
  )
}

function hasTeacherDraftAcknowledgement(text: string, language: DraftLanguage) {
  const structure = formatDraftText(text, language)
  const opening = (structure.paragraphs ?? [])
    .slice(0, 2)
    .join(" ")
    .trim()

  return /\b(thank you for|get in touch|sharing your concerns|sorry to hear|i understand|i appreciate you letting me know|letting me know)\b/i.test(
    opening,
  )
}

function collectIntroducedTeacherDraftPhrases(
  source: string,
  candidate: string,
  phrases: ReadonlyArray<{ label: string; pattern: RegExp }>,
) {
  return collectIntroducedLightEditPhrases(source, candidate, phrases)
}

function detectTeacherDraftQualityViolations(options: {
  sourceText: string
  candidateText: string
  language: DraftLanguage
  teacherDraftMode: boolean
  requestedSignatureName?: string
}) {
  if (!options.teacherDraftMode) {
    return []
  }

  const violations: TeacherDraftQualityViolation[] = []
  const candidate = options.candidateText

  TEACHER_DRAFT_DEFENSIVE_PATTERNS.forEach(({ label, pattern }) => {
    if (pattern.test(candidate)) {
      violations.push({ type: "DEFENSIVE_PHRASE", phrase: label })
    }
  })

  TEACHER_DRAFT_GENERIC_FILLER_PATTERNS.forEach(({ label, pattern }) => {
    if (pattern.test(candidate)) {
      violations.push({ type: "GENERIC_FILLER", phrase: label })
    }
  })

  collectIntroducedTeacherDraftPhrases(
    options.sourceText,
    candidate,
    TEACHER_DRAFT_INVENTED_PROCESS_PHRASES,
  ).forEach((phrase) => {
    violations.push({ type: "INVENTED_PROCESS", phrase })
  })

  collectIntroducedTeacherDraftPhrases(
    options.sourceText,
    candidate,
    TEACHER_DRAFT_FABRICATION_PHRASES,
  ).forEach((phrase) => {
    violations.push({ type: "FABRICATION", phrase })
  })

  if (
    !options.requestedSignatureName &&
    normalizeSignatureLinesForComparison(
      extractTeacherDraftSignatureLines(options.sourceText, options.language),
    ) &&
    normalizeSignatureLinesForComparison(
      extractTeacherDraftSignatureLines(options.sourceText, options.language),
    ) !==
      normalizeSignatureLinesForComparison(extractSignatureLinesForComparison(candidate))
  ) {
    violations.push({ type: "SIGNOFF_CHANGE", phrase: "sign-off changed" })
  }

  if (
    hasTeacherDraftAcknowledgementNeed(options.sourceText) &&
    !hasTeacherDraftAcknowledgement(candidate, options.language)
  ) {
    violations.push({ type: "MISSING_ACKNOWLEDGEMENT", phrase: "brief acknowledgement missing" })
  }

  return violations.filter(
    (violation, index, collection) =>
      collection.findIndex(
        (entry) => entry.type === violation.type && entry.phrase === violation.phrase,
      ) === index,
  )
}

function splitDocumentationSentences(rawMessage: string): string[] {
  const sentences = rawMessage.match(/[^.!?]+[.!?]?/g)

  if (!sentences) {
    return []
  }

  return sentences.map((sentence) => sentence.trim()).filter(Boolean)
}

function normalizeDocumentationSentence(sentence: string): string {
  return sentence
    .replace(/\byour child\b/gi, "The student")
    .replace(/\byour son\b/gi, "The student")
    .replace(/\byour daughter\b/gi, "The student")
    .replace(/^(he|she|they)\b/i, "The student")
    .replace(
      /\bI think (he|she|they) (has|have|might have|could have) (ADHD|autism|dyslexia|anxiety|depression|ODD|ADD)\b/gi,
      "The student may benefit from assessment for learning and attention needs",
    )
    .replace(
      /\b(seems to have|appears to have|might be|could be) (ADHD|autism|dyslexia|anxiety|depression|ODD|ADD)\b/gi,
      "may benefit from assessment for learning and attention needs",
    )
    .replace(
      /\b(ADHD|autism|dyslexia|anxiety|depression|ODD|ADD|emotional problems|emotional issues|psychological issues|psychological problems|mental health concerns)\b/gi,
      "social and emotional needs",
    )
    .replace(
      /\b(seems to have|appears to have|appears to be struggling with)\s+social and emotional needs\b/gi,
      "may need follow-up for social and emotional needs",
    )
    .replace(/\b(deliberately|intentionally|on purpose)\b/gi, "")
    .replace(/\b(chose to|decided to|trying to)\b/gi, "")
    .replace(/\bI've told you this before\b/gi, "The teacher recorded that this had been raised previously.")
    .replace(
      /\bIf this continues we will have to involve the head teacher\b/gi,
      "Further school follow-up may be required if the pattern continues.",
    )
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function extractDocumentationLocation(rawMessage: string): string {
  const normalizedMessage = rawMessage.replace(/\s+/g, " ").trim()
  const locationPatterns = [
    /\b(in|at|during)\s+the\s+(classroom|playground|corridor|hallway|canteen|cafeteria|library|assembly hall|sports hall|gym|lunch hall|dining hall|school office|reception|bus queue|play area|lesson|class)\b/i,
    /\b(on|during)\s+(breaktime|lunchtime|the playground|the corridor|the bus|the trip)\b/i,
  ]

  for (const pattern of locationPatterns) {
    const match = normalizedMessage.match(pattern)
    if (match) {
      return match[0].replace(/\s+/g, " ").trim()
    }
  }

  return "Not specified"
}

function buildDocumentationFallbackDraft(rawMessage: string) {
  const today = new Date().toISOString().split("T")[0]
  const sentences = splitDocumentationSentences(rawMessage)
  const observedBehaviour = normalizeDocumentationSentence(
    sentences[0] ?? "The teacher recorded a classroom concern.",
  )
  const teacherResponse = normalizeDocumentationSentence(
    sentences[1] ?? "The teacher recorded that the concern had been raised previously.",
  )
  const followUpAction = normalizeDocumentationSentence(
    sentences[2] ?? "No follow-up action recorded.",
  )
  const location = extractDocumentationLocation(rawMessage)

  return [
    "Incident Record",
    "",
    `Date: ${today}`,
    `Location: ${location}`,
    `Observed behaviour: ${observedBehaviour}`,
    `Teacher response: ${teacherResponse}`,
    `Follow-up action: ${followUpAction}`,
    "",
    "This record is for documentation purposes.",
  ].join("\n")
}

const MIN_BODY_WORDS = 60
const MIN_BODY_PARAGRAPHS = 2
const MIN_PARENT_MESSAGE_MEANINGFUL_WORDS = 12
const MIN_PARENT_MESSAGE_PARAGRAPHS = 1
const DUPLICATE_GREETING_WINDOW = 5
const MAX_OUTPUT_SAFETY_REWRITE_ATTEMPTS = 2

function shouldRetryParentMessageForSafety(safetyAnalysis: SafetyEngineOutput | null) {
  if (!safetyAnalysis) {
    return false
  }

  const escalationSignalDetected = safetyAnalysis.triggeredSignals.some(
    (signal) => signal.category === "escalation",
  )
  const accusationSignalDetected = safetyAnalysis.triggeredSignals.some(
    (signal) =>
      signal.category === "accusation" ||
      signal.category === "negative_generalisation" ||
      signal.category === "prescriptive_demand",
  )
  const escalationProbability =
    (safetyAnalysis.reactionForecast?.hostile ?? 0) +
    Math.round((safetyAnalysis.reactionForecast?.defensive ?? 0) * 0.6)

  return (
    escalationSignalDetected ||
    accusationSignalDetected ||
    safetyAnalysis.riskLevel === "high" ||
    safetyAnalysis.toneClass === "accusatory" ||
    escalationProbability >= 45 ||
    (safetyAnalysis.reactionForecast?.hostile ?? 0) >= 25 ||
    (safetyAnalysis.reactionForecast?.defensive ?? 0) >= 35
  )
}

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

const LIGHT_EDIT_RISK_CATEGORIES = new Set([
  "accusation",
  "escalation",
  "frustration",
  "negative_generalisation",
  "prescriptive_demand",
] as const)

const LIGHT_EDIT_INSTITUTIONAL_PHRASES = [
  { label: "support coordinator", pattern: /\bsupport coordinator\b/i },
  { label: "SENCO", pattern: /\bsenco\b/i },
  { label: "pastoral", pattern: /\bpastoral\b/i },
  { label: "support process", pattern: /\bschool'?s usual support process\b|\bsupport process\b/i },
  { label: "appropriate colleague", pattern: /\bappropriate colleague\b/i },
  { label: "formal arrangement", pattern: /\bformal arrangement\b/i },
  { label: "on file", pattern: /\bon file\b/i },
] as const

const LIGHT_EDIT_AUTHORITY_SOFTENING_PHRASES = [
  { label: "would it be helpful", pattern: /\bwould it be helpful\b/i },
  { label: "please feel free to contact me", pattern: /\bplease feel free to contact me\b/i },
  { label: "please feel free to reach out", pattern: /\bplease feel free to reach out\b/i },
  { label: "if you would like to discuss this further", pattern: /\bif you would like to discuss this further\b/i },
  { label: "it might be helpful to discuss", pattern: /\bit might be helpful to discuss\b/i },
] as const

const TEACHER_DRAFT_DEFENSIVE_PATTERNS = [
  { label: "can't make individual exceptions", pattern: /\bi can(?:no|')t make individual exceptions?\b/i },
  { label: "unmanageable across the class", pattern: /\bunmanageable across the class\b/i },
  { label: "these expectations will remain in place", pattern: /\bthese expectations will remain in place\b/i },
  { label: "rules are clear", pattern: /\b(?:classroom )?rules are clear(?: that)?\b/i },
  { label: "same expectations consistently for all students", pattern: /\b(?:i need to )?apply the same expectations consistently for all students\b/i },
  { label: "request is unreasonable", pattern: /\bunreasonable\b/i },
  { label: "special treatment", pattern: /\bspecial treatment\b/i },
  { label: "nothing more to discuss", pattern: /\bnothing more to discuss\b/i },
  { label: "marking was fair and consistent", pattern: /\b(?:the )?marking (?:was|is) (?:consistent|fair)(?: and (?:consistent|fair))?\b/i },
  { label: "applied the criteria correctly", pattern: /\bi applied the criteria correctly\b/i },
  { label: "keep challenging this", pattern: /\b(?:it is|it's|i do not think it is) helpful to keep challenging this\b/i },
  { label: "tired of repeating this", pattern: /\bi am tired of repeating this\b/i },
  { label: "can't keep chasing", pattern: /\bi can(?:no|')t keep chasing\b/i },
  { label: "getting frustrating", pattern: /\bgetting frustrating\b/i },
] as const

const TEACHER_DRAFT_GENERIC_FILLER_PATTERNS = [
  { label: "thank you for your support with this", pattern: /\bthank you for your support with this\b/i },
  { label: "working together will help", pattern: /\bworking together will help\b/i },
  { label: "i appreciate your understanding", pattern: /\bi appreciate your understanding\b/i },
  { label: "please feel free to reach out", pattern: /\bplease feel free to reach out\b/i },
  { label: "please feel free to contact me", pattern: /\bplease feel free to contact me\b/i },
] as const

const TEACHER_DRAFT_INVENTED_PROCESS_PHRASES = [
  ...LIGHT_EDIT_INSTITUTIONAL_PHRASES,
  { label: "meeting", pattern: /\bmeeting\b/i },
  { label: "call", pattern: /\bcall\b/i },
  { label: "phone call", pattern: /\bphone call\b/i },
  { label: "policy", pattern: /\bpolicy\b/i },
  { label: "record", pattern: /\brecord\b/i },
  { label: "next week", pattern: /\bnext week\b/i },
] as const

const TEACHER_DRAFT_FABRICATION_PHRASES = [
  { label: "recent conversation", pattern: /\brecent conversation\b/i },
  { label: "previous conversation", pattern: /\bprevious conversation\b/i },
  { label: "our conversation", pattern: /\bour conversation\b/i },
  { label: "arrange a", pattern: /\barrange a\b/i },
  { label: "brief meeting", pattern: /\bbrief meeting\b/i },
  { label: "quick call", pattern: /\bquick call\b/i },
  { label: "support coordinator", pattern: /\bsupport coordinator\b/i },
  { label: "specific approaches", pattern: /\bspecific approaches\b/i },
  { label: "discuss approaches", pattern: /\bdiscuss approaches\b/i },
  { label: "explore what", pattern: /\bexplore what\b/i },
  { label: "what might work", pattern: /\bwhat might work\b/i },
] as const

function getComparableParentBodyText(
  text: string,
  language: DraftLanguage,
  greetingLine?: string | null,
) {
  const structure = formatDraftText(text, language)
  return getMeaningfulParentBodyParagraphs(structure, greetingLine)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !/^(?:Subject|Betreff)\s*[:\-–—|]/i.test(paragraph))
    .join("\n")
}

function normalizeLightEditComparisonText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenizeLightEditComparisonText(text: string) {
  const normalized = normalizeLightEditComparisonText(text)
  return normalized ? normalized.split(" ").filter(Boolean) : []
}

function hasTeacherDraftBoutiqueRewriteRisk(text: string) {
  const normalized = text.trim()
  if (!normalized) {
    return false
  }

  return [...TEACHER_DRAFT_DEFENSIVE_PATTERNS, ...TEACHER_DRAFT_GENERIC_FILLER_PATTERNS].some(
    ({ pattern }) => pattern.test(normalized),
  )
}

function getLightEditSimilarity(source: string, candidate: string) {
  const sourceTokens = tokenizeLightEditComparisonText(source)
  const candidateTokens = tokenizeLightEditComparisonText(candidate)

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

function collectIntroducedLightEditPhrases(
  source: string,
  candidate: string,
  phrases: ReadonlyArray<{ label: string; pattern: RegExp }>,
) {
  const normalizedSource = source.toLowerCase().replace(/\s+/g, " ").trim()
  const normalizedCandidate = candidate.toLowerCase().replace(/\s+/g, " ").trim()
  return phrases
    .filter(({ pattern }) => pattern.test(normalizedCandidate) && !pattern.test(normalizedSource))
    .map(({ label }) => label)
}

function shouldUseLightEditMode(options: {
  mode: DraftMode
  situation: string
  generationMetadata: GenerationMetadata
  teacherDraftMode?: boolean
  rewriteRequested: boolean
  forwardSafeRewrite: boolean
  previousDraft?: string
  documentationModeActive: boolean
  safetyAnalysis: SafetyEngineOutput | null
}) {
  const {
    mode,
    situation,
    generationMetadata,
    teacherDraftMode,
    rewriteRequested,
    forwardSafeRewrite,
    previousDraft,
    documentationModeActive,
    safetyAnalysis,
  } = options

  const firstMeaningfulLine = situation
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !/^(?:Subject|Betreff)\s*:/i.test(line))

  const hasGenericGreetingOnly = Boolean(
    firstMeaningfulLine &&
      /^(?:hello|hi|dear parent\/carer|dear parent|dear family|dear parents|guten tag|liebe eltern|liebe familie),?$/i.test(
        firstMeaningfulLine,
      ),
  )

  if (
    mode !== "parent_message" ||
    documentationModeActive ||
    rewriteRequested ||
    forwardSafeRewrite ||
    Boolean(previousDraft) ||
    (hasGenericGreetingOnly && !teacherDraftMode) ||
    generationMetadata.mode !== "safe_draft" ||
    generationMetadata.direction !== "teacher_to_parent" ||
    generationMetadata.source_type !== "typed_text" ||
    !safetyAnalysis
  ) {
    return false
  }

  if (teacherDraftMode && hasTeacherDraftBoutiqueRewriteRisk(situation)) {
    return false
  }

  if (
    safetyAnalysis.riskLevel !== "low" ||
    safetyAnalysis.professionalRiskFlags.length > 0 ||
    safetyAnalysis.structuralImbalance ||
    (safetyAnalysis.toneClass !== "clinical" && safetyAnalysis.toneClass !== "collaborative")
  ) {
    return false
  }

  return !safetyAnalysis.triggeredSignals.some((signal) =>
    LIGHT_EDIT_RISK_CATEGORIES.has(
      signal.category as
        | "accusation"
        | "escalation"
        | "frustration"
        | "negative_generalisation"
        | "prescriptive_demand",
    ),
  )
}

function assessLightEditDrift(options: {
  sourceText: string
  candidateText: string
  language: DraftLanguage
  greetingLine?: string | null
}) {
  const comparableSource = getComparableParentBodyText(
    options.sourceText,
    options.language,
    options.greetingLine,
  )
  const comparableCandidate = getComparableParentBodyText(
    options.candidateText,
    options.language,
    options.greetingLine,
  )
  const sourceWordCount = countWords(comparableSource)
  const candidateWordCount = countWords(comparableCandidate)
  const similarity = getLightEditSimilarity(comparableSource, comparableCandidate)
  const introducedInstitutionalPhrases = collectIntroducedLightEditPhrases(
    comparableSource,
    comparableCandidate,
    LIGHT_EDIT_INSTITUTIONAL_PHRASES,
  )
  const introducedAuthoritySoftening = collectIntroducedLightEditPhrases(
    comparableSource,
    comparableCandidate,
    LIGHT_EDIT_AUTHORITY_SOFTENING_PHRASES,
  )
  const expansionLimit = Math.max(sourceWordCount + 6, Math.ceil(sourceWordCount * 1.1))
  const expandsContent = candidateWordCount > expansionLimit

  return {
    similarity,
    sourceWordCount,
    candidateWordCount,
    expandsContent,
    introducedInstitutionalPhrases,
    introducedAuthoritySoftening,
    shouldPreserveSource:
      similarity < 0.8 ||
      expandsContent ||
      introducedInstitutionalPhrases.length > 0 ||
      introducedAuthoritySoftening.length > 0,
  }
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
  | "phone_device"
  | "support"
  | "general"

export function detectRouteRecoveryIssueKind(
  source: string | undefined,
  language: string | undefined,
): RouteRecoveryIssueKind {
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
        phone_device: /\b(handy|handys|mobiltelefon|gerät|geräte|bildschirmzeit|unterrichtsregeln)\b/,
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
        phone_device: /\b(phone|phones|mobile|device|devices|screen time|classroom rules)\b/,
        support: /\b(support|help|meeting|follow up|check in|plan)\b/,
      }

  if (patterns.bullying_safety.test(normalized)) return "bullying_safety"
  if (patterns.homework.test(normalized)) return "homework"
  if (patterns.lateness.test(normalized)) return "lateness"
  if (patterns.grading.test(normalized)) return "grading"
  if (patterns.behaviour.test(normalized)) return "behaviour"
  if (patterns.disruption.test(normalized)) return "disruption"
  if (patterns.phone_device.test(normalized)) return "phone_device"
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
      phone_device: ["handy", "unterrichtsregeln", "unterricht", "erwartungen"],
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
    phone_device: ["phone", "phones", "classroom rules", "lesson", "expectations"],
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

async function buildRouteFallbackDraft(fallbackContext: DraftFallbackContext) {
  const sourceGroundedRecovery = await buildSourceGroundedTeacherDraftFallbackResult(fallbackContext)
  return sourceGroundedRecovery?.text ?? buildFallbackDraft(fallbackContext)
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
        const recipient = summarizeRecipientName(candidate, locale)
        return {
          greeting: greetingWithName(locale, candidate, policy),
          confidence: score.level,
          safeName: candidate,
          recipientTitle: recipient.title,
          recipientSurname: recipient.surname,
          recipientDisplayName: recipient.displayName,
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

function extractNamedGreetingCandidate(greeting: string, locale: GreetingLocale) {
  const normalized = normalizeGreetingValue(greeting, locale)
  if (!normalized) {
    return null
  }

  if (locale === "en") {
    return normalized.match(/^(?:hello|hi|dear)\s+(.+),$/i)?.[1]?.trim() ?? null
  }

  return (
    normalized.match(/^(?:guten tag|hallo|sehr geehrte|sehr geehrter)\s+(.+),$/i)?.[1]?.trim() ?? null
  )
}

function enforceTitledGreetingSafeguard(options: {
  greeting: string
  locale: GreetingLocale
  mode?: DraftMode
  direction?: GenerationMetadata["direction"]
  recipientTitle?: string | null
  recipientSurname?: string | null
}) {
  const greeting = normalizeGreetingValue(options.greeting, options.locale)
  if (!greeting) {
    return greeting
  }
  if (options.mode !== "parent_message" || options.direction === "report_comment") {
    return greeting
  }

  const recipientTitle = normalizeName(options.recipientTitle)
  const recipientSurname = normalizeName(options.recipientSurname)
  if (!recipientTitle || !recipientSurname || options.locale !== "en") {
    return greeting
  }

  const titledGreetingPattern = new RegExp(
    `\\b${escapeRegExp(recipientTitle)}\\s+${escapeRegExp(recipientSurname)}\\b`,
    "i",
  )
  if (titledGreetingPattern.test(greeting)) {
    return greeting
  }

  const bareSurnameGreetingPattern = new RegExp(
    `^(dear|hello|hi)\\s+${escapeRegExp(recipientSurname)},?$`,
    "i",
  )
  if (bareSurnameGreetingPattern.test(greeting)) {
    return `Dear ${recipientTitle} ${recipientSurname},`
  }

  return greeting
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
    recipientTitle: greetingResult.recipientTitle ?? null,
    recipientSurname: greetingResult.recipientSurname ?? null,
    recipientDisplayName: greetingResult.recipientDisplayName ?? null,
    source: greetingResult.source,
    final: Boolean(greetingResult.final && (normalizedGreeting || greetingResult.greeting)),
  }
}

function buildUsageLimitError(usage: ReturnType<typeof buildUsageResponse>, language?: string) {
  const isGerman = language?.toLowerCase().startsWith("de")
  const message = isGerman
    ? `Du hast alle ${FREE_TIER_LIMIT} Gratis-Entwürfe in diesem Monat verbraucht. Upgrade auf Draft Pro für unbegrenzte Entwürfe.`
    : `You have used all ${FREE_TIER_LIMIT} free drafts for this month. Upgrade to unlock Draft Pro for unlimited generations.`
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
  teacherDraftMode: boolean,
  lightEditMode: boolean,
  forceLanguage?: boolean,
  safetyAnalysis?: SafetyEngineOutput | null,
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
      teacherDraftMode,
      lightEditMode,
      forceLanguage,
      safetyAnalysis,
    })
  } catch (error) {
    return null
  }
}

const DEBUG_DRAFT_LOGS = process.env.NODE_ENV !== "production" || process.env.DEBUG_DRAFT_LOGS === "1"
const DRAFT_GENERATION_UNAVAILABLE_MESSAGE =
  "Draft generation is temporarily unavailable. Please try again in a few seconds."

export async function POST(request: Request) {
  const requestId = randomUUID()
  const attemptStartedAt = Date.now()
  let documentationModeRequested = false
  let sessionId: string | null = null
  let activeMode: DraftMode | null = null
  let activeModelName: string | null = null

  const logDraftStructured = (
    event: string,
    data: Record<string, unknown>,
    level: "info" | "error" = "info",
  ) => {
    const logger = level === "error" ? console.error : console.info
    logger(`[draft-generate][${event}]`, data)
  }

  const baseDraftLog = () => ({
    requestId,
    sessionId,
    activeMode,
    modelName: activeModelName,
  })

  const logAttemptError = (
    stage: string,
    error: unknown,
    options: {
      fatal?: boolean
      extra?: Record<string, unknown>
    } = {},
  ) => {
    logDraftStructured(
      "attempt_error",
      {
        ...baseDraftLog(),
        stage,
        fatal: options.fatal ?? true,
        elapsedMs: Date.now() - attemptStartedAt,
        errorClass: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        ...options.extra,
      },
      "error",
    )
  }

  const responseHeaders = {
    "x-request-id": requestId,
  }
  const ok = (data: unknown, status = 200) => {
    logDraftStructured("response_send", {
      ...baseDraftLog(),
      success: true,
      status,
      elapsedMs: Date.now() - attemptStartedAt,
    })
    logDraftStructured("attempt_end", {
      ...baseDraftLog(),
      status: "ok",
      elapsedMs: Date.now() - attemptStartedAt,
    })
    return NextResponse.json({ success: true, requestId, data }, { status, headers: responseHeaders })
  }
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
    logDraftStructured(
      "response_send",
      {
        ...baseDraftLog(),
        success: false,
        status,
        code,
        elapsedMs: Date.now() - attemptStartedAt,
      },
      status >= 500 ? "error" : "info",
    )
    logDraftStructured(
      "attempt_end",
      {
        ...baseDraftLog(),
        status: "error",
        code,
        elapsedMs: Date.now() - attemptStartedAt,
      },
      status >= 500 ? "error" : "info",
    )
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
    documentationModeRequested = Boolean(payload?.documentationMode)
    sessionId = (payload.voiceSessionId ?? "").trim() || null

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
  const inputIntent = parseInputIntent(payload?.inputIntent ?? payload?.parentMessageInputType)
  const debugEnabled =
    isDebugEnabled(requestUrl.searchParams) || request.headers.get("x-debug") === "1"
  const generationTrace = mode
    ? inputIntent && mode === "parent_message"
      ? buildGenerationTraceFromInputIntent({
          draftMode: mode,
          locale: language,
          inputIntent,
          requestedInputMode: payload.inputMode,
          requestedSourceType: payload.sourceType,
          hasScanId: Boolean(payload.scanId),
          hasVoiceSessionId: Boolean(payload.voiceSessionId),
        })
      : classifyGenerationRequest({
          draftMode: mode,
          locale: language,
          situation,
          requestedInputMode: payload.inputMode,
          requestedInputIntent: inputIntent ?? undefined,
          requestedParentMessageInputType:
            parseInputIntent(payload?.parentMessageInputType) ?? undefined,
          requestedSourceType: payload.sourceType,
          messageType: payload.messageType ?? null,
          sourceConfidence: payload.ocrConfidence ?? null,
          hasScanId: Boolean(payload.scanId),
          hasVoiceSessionId: Boolean(payload.voiceSessionId),
        })
    : null
  activeMode = mode
  logDraftStructured("attempt_start", {
    ...baseDraftLog(),
    requestedMode: payload.mode ?? null,
    documentationModeRequested,
    inputMode: payload.inputMode ?? null,
    inputIntent,
    parentMessageInputType: payload.parentMessageInputType ?? null,
    sourceType: payload.sourceType ?? null,
    scanId: payload.scanId ?? null,
    situationChars: situation.length,
  })
  logDraftStructured("mode_resolution", {
    ...baseDraftLog(),
    resolvedMode: mode,
    generationMode: generationTrace?.metadata.mode ?? null,
    messageDirection: generationTrace?.metadata.direction ?? null,
    inputIntent,
    parentMessageInputType: payload.parentMessageInputType ?? null,
    sourceType: generationTrace?.metadata.source_type ?? null,
    documentationModeRequested,
  })

  let greetingText = normalizeGreetingValue(
    payload.greeting?.text ?? "",
    language?.toLowerCase().startsWith("de") ? "de" : "en",
  )
  let greetingConfidence = payload.greetingConfidence ?? payload.greeting?.confidence ?? "NONE"
  let greetingSource = payload.greetingSource ?? payload.greeting?.source ?? "generic-fallback"
  let greetingName = payload.greeting?.name ? normalizeName(payload.greeting.name) : null
  let greetingRecipientTitle: string | null = null
  let greetingRecipientSurname: string | null = null
  let greetingRecipientDisplayName: string | null = null
  if (!greetingName) {
    greetingName = null
  }
  let greetingFinal = Boolean(payload.greetingFinal && greetingText)
  const greetingLocale: GreetingLocale = language?.toLowerCase().startsWith("de") ? "de" : "en"
  const requestGreetingCandidate = greetingName ?? extractNamedGreetingCandidate(greetingText, greetingLocale)
  const requestGreetingScore = requestGreetingCandidate
    ? scoreSafeName(requestGreetingCandidate, greetingLocale)
    : null
  if (requestGreetingCandidate && (!requestGreetingScore || !["HIGH", "MEDIUM"].includes(requestGreetingScore.level))) {
    greetingText = ""
    greetingConfidence = "NONE"
    greetingSource = "generic-fallback"
    greetingName = null
    greetingFinal = false
  }
  if (greetingName) {
    const recipient = summarizeRecipientName(greetingName, greetingLocale)
    greetingRecipientTitle = greetingRecipientTitle ?? recipient.title
    greetingRecipientSurname = greetingRecipientSurname ?? recipient.surname
    greetingRecipientDisplayName = greetingRecipientDisplayName ?? recipient.displayName
  }
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
      greetingRecipientTitle = resolvedGreeting.recipientTitle ?? null
      greetingRecipientSurname = resolvedGreeting.recipientSurname ?? null
      greetingRecipientDisplayName = resolvedGreeting.recipientDisplayName ?? null
      const normalizedResolvedName = resolvedGreeting.safeName
        ? normalizeName(resolvedGreeting.safeName)
        : null
      if (normalizedResolvedName) {
        greetingName = greetingName || normalizedResolvedName
      }
      greetingFinal = resolvedGreeting.final
    }
  }

  greetingText = enforceTitledGreetingSafeguard({
    greeting: greetingText,
    locale: greetingLocale,
    mode: mode ?? undefined,
    direction: generationTrace?.metadata.direction,
    recipientTitle: greetingRecipientTitle,
    recipientSurname: greetingRecipientSurname,
  })

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
    recipientTitle: greetingRecipientTitle,
    recipientSurname: greetingRecipientSurname,
    recipientDisplayName: greetingRecipientDisplayName,
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
  const safetyEngineMessageDirection =
    mode === "parent_message" ? "teacher_to_parent" : generationMetadata.direction

  console.log("[safety-engine] input", {
    messageDirection: safetyEngineMessageDirection,
    inputMode: generationMetadata.mode,
    messageLength: countWords(situation),
  })

  const runSafetyAnalysis = async (
    rawMessage: string,
    stage: "input_safety_analysis" | "output_safety_analysis",
  ) => {
    try {
      return await runSafetyEngine({
        rawMessage,
        messageDirection: safetyEngineMessageDirection,
        inputMode: generationMetadata.mode,
      })
    } catch (error) {
      logAttemptError(stage, error, { fatal: false })
      return null
    }
  }

  const safetyAnalysis = await runSafetyAnalysis(situation, "input_safety_analysis")
  console.log("[draft] safety analysis resolved", {
    requestId,
    riskLevel: safetyAnalysis?.riskLevel ?? null,
    professionalRiskFlagCount: safetyAnalysis?.professionalRiskFlags.length ?? 0,
    documentationModeAvailable: safetyAnalysis?.documentationModeAvailable ?? false,
  })
  const documentationModeActive = Boolean(
    payload.documentationMode && safetyAnalysis?.documentationModeAvailable,
  )
  const documentationTopic = documentationModeActive
    ? resolveDocumentationTopicLabel(situation, safetyAnalysis)
    : null
  const sanitizedInput = sanitizeEmailText(situation)
  const cleanedSituationText = sanitizedInput.cleanText
  const requiresSubjectDetail = Boolean(payload.context?.subject)
  const compactParentMessageAllowed =
    mode === "parent_message" &&
    sanitizedInput.wordCount >= 10 &&
    splitDocumentationSentences(cleanedSituationText).length >= 2
  const preflightBlockedInput = detectBlockedLanguage(cleanedSituationText)
  const deferToBlockedLanguageGuard =
    preflightBlockedInput.detected &&
    preflightBlockedInput.tier !== "tier1"
  const insufficientInput =
    (!compactParentMessageAllowed && sanitizedInput.wordCount < 20) ||
    (requiresSubjectDetail && sanitizedInput.substantiveLines === 0)
  if (insufficientInput && !deferToBlockedLanguageGuard) {
    return fail(
      422,
      "INSUFFICIENT_INPUT",
      buildInsufficientInputMessage({
        generationMetadata,
        mode,
        text: cleanedSituationText,
        safetyAnalysis,
      }),
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
  const uidHash = createHash("sha256").update(uid).digest("hex").slice(0, 12)
  logDraftStructured("auth", {
    ...baseDraftLog(),
    uidHash,
    devBypassActive,
    firestoreAvailable: Boolean(firestore),
  })
  const requestedSignatureName = normalizeName(payload.signature?.line1 ?? null) || undefined
  const teacherDraftSourceText =
    typeof payload.situation === "string" && payload.situation.trim()
      ? payload.situation
      : cleanedSituationText
  const teacherProfileDisplayName =
    normalizeName(
      (authContext as { decodedToken?: { name?: string | null } })?.decodedToken?.name ?? null,
    ) || undefined
  const preserveDraftSignatureFromInput =
    mode === "parent_message" && inputIntent === "teacher_draft" && !requestedSignatureName
  const teacherDraftSignatureName = preserveDraftSignatureFromInput
    ? extractTeacherDraftSignatureName(teacherDraftSourceText, language)
    : undefined
  const teacherSignatureName = preserveDraftSignatureFromInput
    ? teacherDraftSignatureName
    : resolveTeacherSignatureName(teacherProfileDisplayName, requestedSignatureName)
  const teacherSignatureSource =
    requestedSignatureName && teacherSignatureName === requestedSignatureName
      ? "request_signature_line1"
      : teacherDraftSignatureName && teacherSignatureName === teacherDraftSignatureName
        ? "source_draft_signature"
      : teacherProfileDisplayName && teacherSignatureName === teacherProfileDisplayName
        ? "auth_display_name"
        : "fallback_placeholder"
  const shouldForceParentMessageSignoff = mode === "parent_message"
  const resolvedSignature = resolveSignature({
    ...payload.signature,
    line1: teacherSignatureName,
    fallbackName: teacherSignatureName,
    autoAppendParentMessage: shouldForceParentMessageSignoff
      ? true
      : payload.signature?.autoAppendParentMessage,
  })
  logDraftStructured("profile_lookup", {
    ...baseDraftLog(),
    uidHash,
    profileFound: Boolean(teacherProfileDisplayName),
    requestedSignatureFound: Boolean(requestedSignatureName),
    signatureFound: Boolean(teacherSignatureName),
    signatureSource: teacherSignatureSource,
  })
  const isDevBypassRequest = devBypassActive
  DEBUG_DRAFT_LOGS && console.info("[draft] routing", {
    uidHash,
    mode: generationMetadata.mode,
    direction: generationMetadata.direction,
    source_type: generationMetadata.source_type,
    ocr_used: generationTrace.ocrUsed,
    transcript_used: generationTrace.transcriptUsed,
    prompt_builder: generationMetadata.prompt_builder,
  })
  DEBUG_DRAFT_LOGS && console.info("[draft] signature resolution", {
    requestId,
    mode,
    teacherSignatureName: teacherSignatureName ?? null,
    teacherSignatureSource,
    requestedAutoAppendParentMessage: payload.signature?.autoAppendParentMessage ?? null,
    forcedParentMessageSignoff: shouldForceParentMessageSignoff,
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
  const sourceTeacherDraftSignatureLines = preserveDraftSignatureFromInput
    ? extractTeacherDraftSignatureLines(teacherDraftSourceText, language)
    : []
  if (!isValidDraftRequest(currentSituation, mode)) {
    return fail(422, "OUT_OF_SCOPE", OUT_OF_SCOPE_REDIRECT_MESSAGE)
  }
  let inputReframed = false
  let inputReframedTier: BlockedLanguageTier | null = null

  const sendBlockedLanguageError = (tier: BlockedLanguageTier, matches: string[] = []) => {
    maybeLogServerEvent("draft_generation_blocked_language", { uid, plan, tier })
    logDraftOutcome("INVALID_REQUEST", { errorCode: "BLOCKED_LANGUAGE" })
    void recordDiagnostic({
      lastErrorCode: "BLOCKED_LANGUAGE",
      lastBlockedLanguageTier: tier,
    })
    const blockedResponse = buildBlockedLanguageResponse(tier, matches)
    return fail(422, "BLOCKED_LANGUAGE", blockedResponse.message, {
      data: {
        blockedLanguage: blockedResponse,
      },
    })
  }

  const blockedInput =
    currentSituation === cleanedSituationText
      ? preflightBlockedInput
      : detectBlockedLanguage(currentSituation)
  if (blockedInput.detected) {
    safetyFlags.add("input-blocked-language")
    if (blockedInput.tier === "tier2") {
      return sendBlockedLanguageError("tier2", blockedInput.matches)
    }
    if (blockedInput.tier === "tier3") {
      return sendBlockedLanguageError("tier3", blockedInput.matches)
    }
    if (!blockedInput.tier) {
      return sendBlockedLanguageError("tier3", blockedInput.matches)
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
  let deescalationSummary: DeescalationSummary | null = null
  if (!(mode === "parent_message" && inputIntent === "teacher_draft")) {
    const deescalationDetection = detectHighEmotionPhrases(preRewriteSituation)
    const deescalationRewrite = rewriteHighEmotionText(preRewriteSituation, deescalationDetection)
    currentSituation = deescalationRewrite.cleanedText
    deescalationSummary = deescalationRewrite.summary
  }
  const originalSituationForPrompt = preRewriteSituation
  const requestedTeacherDraftMode =
    mode === "parent_message" &&
    inputIntent === "teacher_draft" &&
    generationMetadata.direction === "teacher_to_parent"
  const safeLightEditMode = shouldUseLightEditMode({
    mode,
    situation: currentSituation,
    generationMetadata,
    teacherDraftMode: requestedTeacherDraftMode,
    rewriteRequested: Boolean(payload.rewrite),
    forwardSafeRewrite: Boolean(payload.forwardSafeRewrite),
    previousDraft: payload.previousDraft,
    documentationModeActive,
    safetyAnalysis,
  })
  const lightEditMode = safeLightEditMode

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
    documentationSourceText: situation,
    tone,
    language,
    context: sanitizedContext,
    rewrite: Boolean(payload.rewrite),
    forwardSafeRewrite: Boolean(payload.forwardSafeRewrite),
    previousDraft: payload.previousDraft,
    teacherDraftMode: requestedTeacherDraftMode,
    lightEditMode,
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
    greetingConfidence,
    greetingSource,
    messageType: payload.messageType,
    scanId: payload.scanId,
    ocrConfidence: payload.ocrConfidence,
    panicClassificationConfidence: payload.panicClassificationConfidence,
    uiLocale: normalizedUiLocale,
    safetyAnalysis,
    documentationMode: documentationModeActive,
    documentationTopic,
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
    teacherDraftMode: requestedTeacherDraftMode,
    teacherSignatureName,
    greeting: providerGreeting,
    greetingFinal: hasFinalGreeting,
    sourceSituation: currentSituation,
  }
  const configuredModels = getConfiguredModelNames()
  activeModelName = configuredModels.primary
  logDraftStructured("prompt_prepare", {
    ...baseDraftLog(),
    uidHash,
    documentationModeActive,
    hasGreeting: Boolean(providerGreeting?.text),
    hasSignature: resolvedSignature.lines.length > 0,
    profileFound: Boolean(teacherProfileDisplayName),
    signatureFound: Boolean(teacherSignatureName),
    safetyAnalysisAvailable: Boolean(safetyAnalysis),
    lightEditMode,
    fallbackModelName: configuredModels.fallback,
  })
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
    if (documentationModeActive) {
      return
    }
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
            phone_device:
              "Arbeitet im Unterricht grundsätzlich verlässlich mit. Sollte die Unterrichtserwartungen zur Handynutzung noch sicherer und konstanter einhalten.",
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
            phone_device:
              "Works appropriately in class and responds to guidance. Should keep the classroom expectations around phone use more consistently during lessons.",
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
    if (documentationModeActive) {
      return text.trim()
    }

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
    documentationModeActive
      ? text.trim()
      :
    normalizeClosingBlock(text, {
      locale: language,
      omit: mode === "report_comment" || !resolvedSignature.appendForMode[mode],
      signatureLines:
        sourceTeacherDraftSignatureLines.length > 0
          ? sourceTeacherDraftSignatureLines
          : resolvedSignature.lines,
      fallbackName: language?.toLowerCase().startsWith("de")
        ? FALLBACK_SIGNATURES.de
        : FALLBACK_SIGNATURES.en,
    })
  const finalizeDraftWithSignature = (text: string) =>
    documentationModeActive
      ? finalizeDraft(text)
      : normalizeClosingForMode(applySignatureToDraft(finalizeDraft(text), resolvedSignature, mode))
  const finalizeWithGreeting = (text: string) =>
    documentationModeActive
      ? finalizeDraftWithSignature(text)
      : removeDuplicateGreeting(finalizeDraftWithSignature(text), finalGreetingLine)
  const runDraft = async (
    forceLanguage = false,
    forceContinuation = false,
    callReason = "primary",
  ) => {
    logDraftStructured("openai_call_start", {
      ...baseDraftLog(),
      callReason,
      documentationMode: documentationModeActive,
      forceLanguage,
      forceContinuation,
      riskLevel: safetyAnalysis?.riskLevel ?? null,
      professionalRiskFlagCount: safetyAnalysis?.professionalRiskFlags.length ?? 0,
    })
    if (documentationModeActive) {
      try {
        const result = await generateDraft({
          ...providerInput,
          forceLanguage,
          forceContinuation,
        })
        activeModelName = result.providerMeta.modelUsed
        logDraftStructured("openai_call_end", {
          ...baseDraftLog(),
          callReason,
          documentationMode: true,
          status: "ok",
          modelName: result.providerMeta.modelUsed,
          elapsedMs: result.providerMeta.latencyMs ?? null,
        })

        return {
          result,
          usedFallback: false,
          errorCode: null,
        }
      } catch (error) {
        logAttemptError("draft_provider", error, {
          fatal: false,
          extra: {
            callReason,
            documentationMode: true,
            generationMode: generationMetadata.mode,
            messageDirection: generationMetadata.direction,
            documentationTopic,
          },
        })
        logDraftStructured(
          "openai_call_end",
          {
            ...baseDraftLog(),
            callReason,
            documentationMode: true,
            status: "error",
            elapsedMs: null,
            errorClass: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          "error",
        )
        logDraftStructured("openai_retry", {
          ...baseDraftLog(),
          callReason,
          retryType: "documentation_fallback",
        })

        return {
          result: {
            text: buildDocumentationFallbackDraft(providerInput.documentationSourceText ?? situation),
            providerMeta: {
              modelUsed: "documentation-mode-fallback",
              latencyMs: 0,
            },
          },
          usedFallback: true,
          errorCode: "DOCUMENTATION_MODE_FALLBACK",
        }
      }
    }

    const result = await generateDraftWithFallback(
      { ...providerInput, forceLanguage, forceContinuation },
      fallbackContext,
    )
    activeModelName = result.result.providerMeta.modelUsed
    if (result.usedFallback) {
      logDraftStructured("openai_retry", {
        ...baseDraftLog(),
        callReason,
        retryType: "provider_fallback",
        errorCode: result.errorCode ?? null,
      })
    }
    logDraftStructured("openai_call_end", {
      ...baseDraftLog(),
      callReason,
      documentationMode: false,
      status: "ok",
      usedFallback: result.usedFallback,
      errorCode: result.errorCode ?? null,
      modelName: result.result.providerMeta.modelUsed,
      elapsedMs: result.result.providerMeta.latencyMs ?? null,
    })
    return result
  }

  let draftAttempt = await runDraft(false, false, "primary")
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
    draftAttempt = await runDraft(true, false, "forced_language_retry")
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
    !documentationModeActive &&
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
    if (documentationModeActive) {
      generatedDraft = generatedDraft.trim()
      formattedDraftStructure = formatDraftText(generatedDraft, language)
      bodyParagraphCount = formattedDraftStructure.paragraphs.filter((paragraph) => paragraph.trim()).length
      bodyWordCount = countWords(generatedDraft)
      return
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
      tone,
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
    if (documentationModeActive) {
      formattedDraftStructure = formatDraftText(generatedDraft, language)
      bodyParagraphCount = formattedDraftStructure.paragraphs.filter((paragraph) => paragraph.trim()).length
      bodyWordCount = countWords(generatedDraft)
      return
    }

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
  const shouldUseGreetingRecoveryTemplate = Boolean(
    !documentationModeActive && finalGreetingLine && greetingSource === "resolved-name",
  )
  const evaluateBodyNeedsRetry = () =>
    Boolean(
      shouldUseGreetingRecoveryTemplate &&
        (bodyWordCount < MIN_BODY_WORDS || bodyParagraphCount < MIN_BODY_PARAGRAPHS),
    )

  const hasMinimumParentMessageOutput = () =>
    documentationModeActive ||
    mode !== "parent_message" ||
    (bodyParagraphCount >= MIN_PARENT_MESSAGE_PARAGRAPHS &&
      bodyWordCount >= MIN_PARENT_MESSAGE_MEANINGFUL_WORDS)

  const shouldSkipCollapsedOutputContinuationRetry = () => {
    if (documentationModeActive || mode !== "parent_message") {
      return false
    }

    const meaningfulParagraphs = getMeaningfulParentBodyParagraphs(
      formattedDraftStructure,
      finalGreetingLine,
    )
    const nonScaffoldParagraphs = meaningfulParagraphs
      .map((paragraph) => paragraph.trim())
      .filter(
        (paragraph) => paragraph && !/^(?:Subject|Betreff)\s*[:\-–—|]/i.test(paragraph),
      )

    if (nonScaffoldParagraphs.length === 0) {
      return true
    }

    const firstMeaningfulParagraph = nonScaffoldParagraphs[0] ?? ""
    return nonScaffoldParagraphs.length === 1 && countWords(firstMeaningfulParagraph) <= 3
  }

  const recoverCollapsedParentMessageOutput = async () => {
    if (documentationModeActive || mode !== "parent_message" || hasMinimumParentMessageOutput()) {
      return
    }

    if (!shouldSkipCollapsedOutputContinuationRetry()) {
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
    }

    generatedDraft = finalizeWithGreeting(await buildRouteFallbackDraft(fallbackContext))
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
    if (documentationModeActive) {
      return
    }

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
    const fallbackDraft = finalizeWithGreeting(await buildRouteFallbackDraft(fallbackContext))
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

  const preserveLightEditSourceIfNeeded = () => {
    if (!lightEditMode || documentationModeActive || mode !== "parent_message") {
      return
    }

    const sourceDraft = finalizeWithGreeting(currentSituation)
    const driftAssessment = assessLightEditDrift({
      sourceText: sourceDraft,
      candidateText: generatedDraft,
      language,
      greetingLine: finalGreetingLine,
    })

    if (!driftAssessment.shouldPreserveSource) {
      return
    }

    generatedDraft = sourceDraft
    finalizeAndFormatDraft(generatedDraft)
    pushRecoveryEvent("deterministic_fallback", "LIGHT_EDIT_SOURCE_PRESERVATION")
  }

  const preserveTeacherDraftSignatureIfNeeded = () => {
    if (
      documentationModeActive ||
      mode !== "parent_message" ||
      inputIntent !== "teacher_draft" ||
      requestedSignatureName
    ) {
      return
    }

    const preservedDraft = preserveTeacherDraftSignature(
      teacherDraftSourceText,
      generatedDraft,
      language,
    )
    if (preservedDraft === generatedDraft) {
      return
    }

    generatedDraft = preservedDraft.trim()
    formattedDraftStructure = formatDraftText(generatedDraft, language)
    bodyParagraphCount = getParagraphCountExcludingGreeting(formattedDraftStructure, finalGreetingLine)
    bodyWordCount = getMeaningfulParentBodyWordCount(formattedDraftStructure, finalGreetingLine)
  }

  preserveLightEditSourceIfNeeded()
  preserveTeacherDraftSignatureIfNeeded()

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
    return sendBlockedLanguageError(
      blockedDetection.tier ?? "tier3",
      blockedDetection.matches,
    )
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
        requestedTeacherDraftMode,
        lightEditMode,
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

  let outputSafetyAnalysis: SafetyEngineOutput | null = null
  if (!documentationModeActive && mode === "parent_message") {
    outputSafetyAnalysis = await runSafetyAnalysis(generatedDraft, "output_safety_analysis")
  }

  let outputSafetyRewriteAttempts = 0
  while (
    !documentationModeActive &&
    mode === "parent_message" &&
    shouldRetryParentMessageForSafety(outputSafetyAnalysis) &&
    outputSafetyRewriteAttempts < MAX_OUTPUT_SAFETY_REWRITE_ATTEMPTS
  ) {
    const previousDraft = generatedDraft
    const rewriteResult = await reRunWithRewrite(
      payload,
      generatedDraft,
      resolvedPronounPreference,
      mode,
      generationMetadata,
      requestedTeacherDraftMode,
      lightEditMode,
      forcedLanguageAttempted,
      outputSafetyAnalysis,
    )
    if (!rewriteResult) {
      break
    }

    outputSafetyRewriteAttempts += 1
    generatedDraft = finalizeDraftWithSignature(rewriteResult.text)
    providerMeta = rewriteResult.providerMeta
    finalizeAndFormatDraft(generatedDraft)
    outputSafetyAnalysis = await runSafetyAnalysis(generatedDraft, "output_safety_analysis")
    pushRecoveryEvent("retry_generation", "OUTPUT_SAFETY_REWRITE")

    if (generatedDraft.trim() === previousDraft.trim()) {
      break
    }
  }

  preserveLightEditSourceIfNeeded()
  preserveTeacherDraftSignatureIfNeeded()

  let teacherDraftQualityViolations = detectTeacherDraftQualityViolations({
    sourceText: currentSituation,
    candidateText: generatedDraft,
    language,
    teacherDraftMode: requestedTeacherDraftMode,
    requestedSignatureName,
  })
  let teacherDraftQualityRegenerationAttempts = 0

  const attemptTeacherDraftQualityRegeneration = async (
    currentViolations: TeacherDraftQualityViolation[],
  ) => {
    if (currentViolations.length === 0 || teacherDraftQualityRegenerationAttempts >= 2) {
      return currentViolations
    }

    teacherDraftQualityRegenerationAttempts += 1
    providerInput.teacherDraftQualityViolations = {
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
    preserveTeacherDraftSignatureIfNeeded()
    providerInput.teacherDraftQualityViolations = undefined
    pushRecoveryEvent(
      usedFallback ? "deterministic_fallback" : "retry_generation",
      "TEACHER_DRAFT_QUALITY_RETRY",
      regenerationAttempt.recoveryMeta?.templateFamily ?? null,
    )

    return detectTeacherDraftQualityViolations({
      sourceText: currentSituation,
      candidateText: generatedDraft,
      language,
      teacherDraftMode: requestedTeacherDraftMode,
      requestedSignatureName,
    })
  }

  while (teacherDraftQualityViolations.length > 0 && teacherDraftQualityRegenerationAttempts < 2) {
    teacherDraftQualityViolations = await attemptTeacherDraftQualityRegeneration(
      teacherDraftQualityViolations,
    )
  }

  if (teacherDraftQualityViolations.length > 0) {
    const fallbackDraft = finalizeWithGreeting(await buildRouteFallbackDraft(fallbackContext))
    const fallbackViolations = detectTeacherDraftQualityViolations({
      sourceText: currentSituation,
      candidateText: fallbackDraft,
      language,
      teacherDraftMode: requestedTeacherDraftMode,
      requestedSignatureName,
    })

    if (fallbackViolations.length === 0) {
      generatedDraft = fallbackDraft
      finalizeAndFormatDraft(generatedDraft)
      preserveTeacherDraftSignatureIfNeeded()
      providerMeta = {
        modelUsed: "teacher-draft-boutique-fallback",
        latencyMs: providerMeta.latencyMs,
      }
      usedFallback = true
      fallbackErrorCode = fallbackErrorCode ?? "TEACHER_DRAFT_QUALITY_FALLBACK"
      teacherDraftQualityViolations = []
      pushRecoveryEvent("deterministic_fallback", "TEACHER_DRAFT_QUALITY_FALLBACK")
    }
  }

  if (!documentationModeActive && mode === "parent_message") {
    outputSafetyAnalysis = await runSafetyAnalysis(generatedDraft, "output_safety_analysis")
  }

  const teacherDraftFeedback =
    requestedTeacherDraftMode && outputSafetyAnalysis
      ? resolveTeacherDraftFeedback({
          ...assessLightEditDrift({
            sourceText: finalizeWithGreeting(currentSituation),
            candidateText: generatedDraft,
            language,
            greetingLine: finalGreetingLine,
          }),
          inputSafetyAnalysis: safetyAnalysis,
          outputSafetyAnalysis,
          deescalationSummary,
        })
      : null

  logDraftStructured("normalization", {
    ...baseDraftLog(),
    bodyParagraphCount,
    bodyWordCount,
    documentationModeActive,
    outputSafetyRewrites: outputSafetyRewriteAttempts,
    generatedChars: generatedDraft.length,
  })

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
  const teacherIntent = classifyTeacherIntent({
    situation: cleanedSituationText,
    draftMode: mode,
    documentationMode: documentationModeActive,
    messageType: payload.messageType ?? null,
    messageDirection: generationMetadata.direction,
    safetyAnalysis,
  })

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
    teacherIntent,
    forwardSafeRewrite: Boolean(payload.forwardSafeRewrite && payload.rewrite),
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
    teacherIntent: metadata.teacherIntent,
    forwardSafeRewrite: metadata.forwardSafeRewrite,
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
    teacherDraftFeedback,
    metadata,
    meta: responseMeta,
    usage: usageAfterGeneration,
    snippetId,
    deescalationSummary,
    safetyAnalysis,
    outputSafetyAnalysis,
    documentationModeActive,
  })
  } catch (error) {
    logAttemptError("route_unhandled", error, {
      extra: {
        documentationMode: documentationModeRequested,
      },
    })
    return fail(503, "AI_GENERATION_FAILED", DRAFT_GENERATION_UNAVAILABLE_MESSAGE)
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

