import type { DraftLanguage, DraftMode } from "@/lib/types"

export type GenerationInputMode = "safe_draft" | "panic_scan" | "voice_to_calm"
export type InputIntent = "parent_message" | "teacher_draft"
export type ParentMessageInputType = InputIntent
export type MessageDirection =
  | "parent_to_teacher"
  | "teacher_to_parent"
  | "teacher_internal_notes"
  | "report_comment"
export type SourceType = "typed_text" | "ocr_text" | "voice_transcript"
export type PromptBuilderId = GenerationInputMode

export interface GenerationMetadata {
  mode: GenerationInputMode
  direction: MessageDirection
  source_type: SourceType
  locale: DraftLanguage
  prompt_builder: PromptBuilderId
}

export interface GenerationTrace {
  metadata: GenerationMetadata
  ocrUsed: boolean
  transcriptUsed: boolean
}

interface BaseGenerationInput {
  draftMode: DraftMode
  locale: DraftLanguage
  requestedInputMode?: GenerationInputMode
  requestedSourceType?: SourceType
  hasScanId?: boolean
  hasVoiceSessionId?: boolean
}

interface ClassificationInput {
  draftMode: DraftMode
  locale: DraftLanguage
  situation: string
  requestedInputMode?: GenerationInputMode
  requestedInputIntent?: InputIntent
  requestedParentMessageInputType?: ParentMessageInputType
  requestedSourceType?: SourceType
  messageType?: string | null
  sourceConfidence?: number | null
  hasScanId?: boolean
  hasVoiceSessionId?: boolean
}

interface ExplicitInputIntentTraceInput extends BaseGenerationInput {
  inputIntent: InputIntent
}

const INPUT_MODES: GenerationInputMode[] = ["safe_draft", "panic_scan", "voice_to_calm"]
const INPUT_INTENTS: InputIntent[] = ["parent_message", "teacher_draft"]
const SOURCE_TYPES: SourceType[] = ["typed_text", "ocr_text", "voice_transcript"]

const TEACHER_GREETING_PATTERNS = [
  /^subject:/i,
  /^betreff:/i,
  /^dear\b/i,
  /^hello\b/i,
  /^hi\b/i,
  /^guten tag\b/i,
  /^liebe(?:r|n)?\b/i,
  /^sehr geehrte\b/i,
]

const CLOSING_PATTERNS = [
  /\bregards\b/i,
  /\bbest regards\b/i,
  /\bkind regards\b/i,
  /\byours sincerely\b/i,
  /\bsincerely\b/i,
  /\bmit freundlichen grüßen\b/i,
  /\bherzliche grüße\b/i,
  /\bfreundliche grüße\b/i,
]

const PARENT_INCOMING_PATTERNS = [
  /\bi am worried\b/i,
  /\bi'm worried\b/i,
  /\bmy child\b/i,
  /\bmy son\b/i,
  /\bmy daughter\b/i,
  /\bunser kind\b/i,
  /\bmein kind\b/i,
  /\bmeine tochter\b/i,
  /\bmein sohn\b/i,
  /\bwhy did\b/i,
  /\bwarum\b/i,
  /\bwe would expect\b/i,
  /\bi would appreciate(?: it)? if\b/i,
  /\bit is important that\b/i,
  /\bneeds are understood and respected\b/i,
]

const TEACHER_OUTGOING_PATTERNS = [
  /\bsubject:\b/i,
  /\bbetreff:\b/i,
  /\byour child\b/i,
  /\byour son\b/i,
  /\byour daughter\b/i,
  /\bin class\b/i,
  /\bat school\b/i,
  /\bi wanted to let you know\b/i,
  /\bi wanted to update you\b/i,
  /\bi am writing to\b/i,
  /\bich möchte ihnen\b/i,
  /\bich wollte ihnen\b/i,
  /\bihr kind\b/i,
  /\bim unterricht\b/i,
  /\bin der schule\b/i,
]

const TEACHER_DRAFT_SIGNAL_PATTERNS = [
  /\bi will\b/i,
  /\bi need to\b/i,
  /\bi have\b/i,
  /\bi understand\b/i,
  /\bi apply\b/i,
  /\bi expect\b/i,
  /\bi wanted to update you\b/i,
  /\byour child\b/i,
  /\bin class\b/i,
  /\bclassroom\b/i,
  /\ball students\b/i,
  /\bconsistently\b/i,
]

const PARENT_PERSPECTIVE_PATTERNS = [
  /\bmy child\b/i,
  /\bmy son\b/i,
  /\bmy daughter\b/i,
  /\bi(?:'m| am) concerned about\b/i,
]

function isKnownInputMode(value: unknown): value is GenerationInputMode {
  return typeof value === "string" && INPUT_MODES.includes(value as GenerationInputMode)
}

function isKnownInputIntent(value: unknown): value is InputIntent {
  return typeof value === "string" && INPUT_INTENTS.includes(value as InputIntent)
}

function resolveExplicitInputIntent(input: ClassificationInput): InputIntent | null {
  if (isKnownInputIntent(input.requestedInputIntent)) {
    return input.requestedInputIntent
  }

  if (isKnownInputIntent(input.requestedParentMessageInputType)) {
    return input.requestedParentMessageInputType
  }

  return null
}

function isKnownSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && SOURCE_TYPES.includes(value as SourceType)
}

function normalizeText(text: string) {
  return text.replace(/\r/g, "").trim()
}

export function looksLikeTeacherAuthoredDraft(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return false
  }

  const firstContentLine = lines[0] ?? ""
  const possibleGreetingLine =
    /^subject:|^betreff:/i.test(firstContentLine) ? (lines[1] ?? "") : firstContentLine

  const hasTeacherGreeting = /^dear\s+\w/i.test(possibleGreetingLine)
  const hasTeacherSignoff =
    /(?:^|\n)\s*(?:Regards|Kind regards|Best regards|Yours sincerely),?\s*\n\s*[\p{L}][\p{L}.' -]*\s*$/iu.test(
      normalized,
    ) || CLOSING_PATTERNS.some((pattern) => pattern.test(normalized))
  const teacherSignalCount = TEACHER_DRAFT_SIGNAL_PATTERNS.filter((pattern) =>
    pattern.test(normalized),
  ).length
  const hasParentPerspectiveLanguage = PARENT_PERSPECTIVE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  )

  return (
    hasTeacherGreeting &&
    hasTeacherSignoff &&
    teacherSignalCount >= 2 &&
    !hasParentPerspectiveLanguage
  )
}

export function looksLikeIncomingParentMessage(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  return PARENT_INCOMING_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function looksLikeIncomingParentEmail(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    return false
  }

  const firstLine = lines[0] ?? ""
  const lastLine = lines[lines.length - 1] ?? ""
  const hasOpening = /^subject:|^betreff:|^hello\b|^hi\b|^dear\b|^guten tag\b|^liebe(?:r|n)?\b/i.test(
    firstLine,
  )
  const hasClosing = CLOSING_PATTERNS.some((pattern) => pattern.test(normalized))
  const hasParentRelationshipSignoff =
    /\b(?:dad|mum|mom|mother|father|parent|carer|guardian|grandma|grandmother|grandad|grandfather)\b/i.test(
      lastLine,
    ) || /\b[\p{L}]+['’]s\s+(?:dad|mum|mom|mother|father|parent|carer|guardian)\b/iu.test(lastLine)

  return hasOpening && hasClosing && (looksLikeIncomingParentMessage(normalized) || hasParentRelationshipSignoff)
}

function hasStrongTeacherOutgoingEvidence(text: string) {
  const normalized = normalizeText(text)
  if (!normalized || !looksLikeTeacherAuthoredDraft(normalized) || looksLikeIncomingParentMessage(normalized)) {
    return false
  }

  let score = 0
  for (const pattern of TEACHER_OUTGOING_PATTERNS) {
    if (pattern.test(normalized)) {
      score += 1
    }
  }

  return score >= 2
}

function resolveInputMode(input: BaseGenerationInput): GenerationInputMode {
  if (isKnownInputMode(input.requestedInputMode)) {
    return input.requestedInputMode
  }

  if (isKnownSourceType(input.requestedSourceType)) {
    if (input.requestedSourceType === "ocr_text") {
      return "panic_scan"
    }
    if (input.requestedSourceType === "voice_transcript") {
      return "voice_to_calm"
    }
  }

  if (input.hasScanId) {
    return "panic_scan"
  }
  if (input.hasVoiceSessionId) {
    return "voice_to_calm"
  }

  return "safe_draft"
}

function resolveSourceType(
  requestedSourceType: ClassificationInput["requestedSourceType"],
  inputMode: GenerationInputMode,
): SourceType {
  if (isKnownSourceType(requestedSourceType)) {
    return requestedSourceType
  }

  if (inputMode === "panic_scan") {
    return "ocr_text"
  }
  if (inputMode === "voice_to_calm") {
    return "voice_transcript"
  }
  return "typed_text"
}

function buildGenerationTrace(
  draftMode: DraftMode,
  locale: DraftLanguage,
  inputMode: GenerationInputMode,
  sourceType: SourceType,
  direction: MessageDirection,
): GenerationTrace {
  const resolvedDirection = draftMode === "report_comment" ? "report_comment" : direction

  return {
    metadata: {
      mode: inputMode,
      direction: resolvedDirection,
      source_type: sourceType,
      locale,
      prompt_builder: inputMode,
    },
    ocrUsed: sourceType === "ocr_text",
    transcriptUsed: sourceType === "voice_transcript",
  }
}

export function buildGenerationTraceFromInputIntent(
  input: ExplicitInputIntentTraceInput,
): GenerationTrace {
  const inputMode = resolveInputMode(input)
  const sourceType = resolveSourceType(input.requestedSourceType, inputMode)
  const direction = input.inputIntent === "teacher_draft" ? "teacher_to_parent" : "parent_to_teacher"

  return buildGenerationTrace(input.draftMode, input.locale, inputMode, sourceType, direction)
}

function resolveMessageDirection(
  input: ClassificationInput,
  inputMode: GenerationInputMode,
): MessageDirection {
  if (input.draftMode === "report_comment") {
    return "report_comment"
  }

  if (inputMode === "panic_scan") {
    const sourceConfidence = input.sourceConfidence ?? 0
    if (sourceConfidence >= 0.75 && hasStrongTeacherOutgoingEvidence(input.situation)) {
      return "teacher_to_parent"
    }
    return "parent_to_teacher"
  }

  if (inputMode === "voice_to_calm") {
    if (looksLikeTeacherAuthoredDraft(input.situation)) {
      return "teacher_to_parent"
    }
    if (looksLikeIncomingParentMessage(input.situation) && input.messageType === "parent_complaint") {
      return "parent_to_teacher"
    }
    return "teacher_internal_notes"
  }

  const explicitInputIntent = resolveExplicitInputIntent(input)
  if (input.draftMode === "parent_message" && inputMode === "safe_draft" && explicitInputIntent) {
    return explicitInputIntent === "teacher_draft" ? "teacher_to_parent" : "parent_to_teacher"
  }

  if (looksLikeIncomingParentEmail(input.situation)) {
    return "parent_to_teacher"
  }

  if (looksLikeTeacherAuthoredDraft(input.situation)) {
    return "teacher_to_parent"
  }

  return "teacher_internal_notes"
}

export function classifyGenerationRequest(input: ClassificationInput): GenerationTrace {
  const inputMode = resolveInputMode(input)
  const sourceType = resolveSourceType(input.requestedSourceType, inputMode)
  const direction = resolveMessageDirection(input, inputMode)

  return buildGenerationTrace(input.draftMode, input.locale, inputMode, sourceType, direction)
}
