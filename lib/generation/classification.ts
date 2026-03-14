import type { DraftLanguage, DraftMode } from "@/lib/types"

export type GenerationInputMode = "safe_draft" | "panic_scan" | "voice_to_calm"
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

interface ClassificationInput {
  draftMode: DraftMode
  locale: DraftLanguage
  situation: string
  requestedInputMode?: GenerationInputMode
  requestedSourceType?: SourceType
  messageType?: string | null
  sourceConfidence?: number | null
  hasScanId?: boolean
  hasVoiceSessionId?: boolean
}

const INPUT_MODES: GenerationInputMode[] = ["safe_draft", "panic_scan", "voice_to_calm"]
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
  /\bbest regards\b/i,
  /\bkind regards\b/i,
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

function isKnownInputMode(value: unknown): value is GenerationInputMode {
  return typeof value === "string" && INPUT_MODES.includes(value as GenerationInputMode)
}

function isKnownSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && SOURCE_TYPES.includes(value as SourceType)
}

function normalizeText(text: string) {
  return text.replace(/\r/g, "").trim()
}

function looksLikeTeacherAuthoredDraft(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  const firstLine = normalized.split("\n").find((line) => line.trim().length > 0) ?? ""
  return (
    TEACHER_GREETING_PATTERNS.some((pattern) => pattern.test(firstLine)) &&
    CLOSING_PATTERNS.some((pattern) => pattern.test(normalized))
  )
}

function looksLikeIncomingParentMessage(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  return PARENT_INCOMING_PATTERNS.some((pattern) => pattern.test(normalized))
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

function resolveInputMode(input: ClassificationInput): GenerationInputMode {
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

  if (looksLikeTeacherAuthoredDraft(input.situation)) {
    return "teacher_to_parent"
  }

  return "teacher_internal_notes"
}

export function classifyGenerationRequest(input: ClassificationInput): GenerationTrace {
  const inputMode = resolveInputMode(input)
  const sourceType = resolveSourceType(input.requestedSourceType, inputMode)
  const direction = resolveMessageDirection(input, inputMode)

  return {
    metadata: {
      mode: inputMode,
      direction,
      source_type: sourceType,
      locale: input.locale,
      prompt_builder: inputMode,
    },
    ocrUsed: sourceType === "ocr_text",
    transcriptUsed: sourceType === "voice_transcript",
  }
}
