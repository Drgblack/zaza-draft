import type { DraftLanguage } from "@/lib/types"
import { extractTrailingClosingBlock, formatDraftText } from "@/lib/draft/format"
import {
  checkIntentPreservation,
  classifyTeacherIntent,
} from "@/lib/draft/intent-classification"
import type { LengthTarget } from "@/lib/draft/length-calibration"
import { detectRegisterViolations } from "@/lib/draft/register-accuracy"
import {
  checkVoicePreservation,
  extractVoiceProfile,
} from "@/lib/draft/voice-preservation"
import type { SafetyEngineOutput } from "@/src/lib/safetyEngine"

export type DraftQualityCategory =
  | "FABRICATION"
  | "DEFENSIVE_PHRASE"
  | "GENERIC_FILLER"
  | "BOUNDARY_DILUTION"
  | "INCONSISTENT_FRAMING"
  | "OVER_SOFTENING"
  | "MESSAGE_EXPANSION"
  | "GENERIC_REASSURANCE_FILLER"
  | "OVER_EXPLANATION"
  | "REGISTER_ACCURACY"
  | "INTENT_DRIFT"
  | "SENTENCE_LENGTH_DRIFT"
  | "FORMALITY_DRIFT"
  | "PERSON_DRIFT"
  | "LENGTH_EXCEEDED"
  | "SIGNATURE_DRIFT"
  | "MISSING_ACKNOWLEDGEMENT"

export type DraftQualityCheckName =
  | "FABRICATION"
  | "DEFENSIVE_PHRASE"
  | "GENERIC_FILLER"
  | "BOUNDARY_DILUTION"
  | "INCONSISTENT_FRAMING"
  | "OVER_SOFTENING"
  | "MESSAGE_EXPANSION"
  | "GENERIC_REASSURANCE_FILLER"
  | "OVER_EXPLANATION"
  | "REGISTER_ACCURACY"
  | "INTENT_DRIFT"
  | "SENTENCE_LENGTH_DRIFT"
  | "FORMALITY_DRIFT"
  | "PERSON_DRIFT"
  | "LENGTH_EXCEEDED"
  | "SIGNATURE_DRIFT"
  | "MISSING_ACKNOWLEDGEMENT"

export type DraftQualityViolation = {
  category: DraftQualityCategory
  phrase: string
  severity: "blocking" | "advisory"
}

export type DraftQualityResult = {
  verdict: "already_strong" | "improved" | "needs_rewrite"
  violations: DraftQualityViolation[]
  passedChecks: DraftQualityCheckName[]
  similarity: number
  wordCount: number
}

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

const GENERIC_REASSURANCE_FILLER_PATTERNS = [
  { label: "working together", pattern: /\bworking together\b/i },
  { label: "support moving forward", pattern: /\bsupport moving forward\b/i },
  { label: "we are all on the same page", pattern: /\bwe('re| are) all on the same (page|team)\b/i },
  { label: "moving forward together", pattern: /\bmoving forward together\b/i },
  { label: "in partnership", pattern: /\bin partnership\b/i },
] as const

const BOUNDARY_DILUTION_PATTERN =
  /\b(we('ll| will) consider|we('ll| will) review|we can look at|this may be reviewed|open to reviewing|willing to reconsider)\b/i
const SOURCE_FIRM_BOUNDARY_PATTERN = /\b(will not|cannot|won't|not permitted|not allowed|must not)\b/i
const INCONSISTENT_FIRM_MARKERS_PATTERN =
  /\b(will not|cannot|won't|must not|not permitted|not allowed|remains in place)\b/i
const INCONSISTENT_HEDGE_MARKERS_PATTERN =
  /\b(where possible|as much as possible|try to|ideally|in most cases|generally speaking|in the majority of cases)\b/i
const CANDIDATE_HEDGING_PATTERN =
  /\b(may not|might not|ideally|where possible|as much as possible|try to)\b/i
const EXPLANATION_PATTERN = /\bbecause\b|\bin order to\b|\bso that\b|\bto ensure\b/i

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length
}

function normalizeSimilarityText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getWordSequenceSimilarity(source: string, candidate: string) {
  const sourceTokens = normalizeSimilarityText(source).split(" ").filter(Boolean)
  const candidateTokens = normalizeSimilarityText(candidate).split(" ").filter(Boolean)

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

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
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

function collectPatternMatches(
  text: string,
  patterns: ReadonlyArray<{ label: string; pattern: RegExp }>,
) {
  return patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

function collectIntroducedPatternMatches(
  source: string,
  candidate: string,
  patterns: ReadonlyArray<{ label: string; pattern: RegExp }>,
) {
  return patterns
    .filter(({ pattern }) => !pattern.test(source) && pattern.test(candidate))
    .map(({ label }) => label)
}

function normalizeSignatureLines(lines: string[]) {
  return lines
    .map((line) => line.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean)
    .join("\n")
}

function isLikelyTeacherSignatureName(value: string, language: DraftLanguage) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized || normalized.length > 80) {
    return false
  }

  if (/\b(parent|carer|dad|mum|mom|mother|father|guardian|eltern|mutter|vater)\b/i.test(normalized)) {
    return false
  }

  if (/^[A-ZÄÖÜ][\p{L}'’-]+(?:\s+[A-ZÄÖÜ][\p{L}'’-]+){0,3}$/u.test(normalized)) {
    return true
  }

  if (language === "de") {
    return /^[A-ZÄÖÜ][\p{L}'’-]+$/u.test(normalized)
  }

  return /^[A-Z][\p{L}'’-]+$/u.test(normalized)
}

function extractTeacherDraftSignatureLines(text: string, language: DraftLanguage) {
  const closingBlock = extractTrailingClosingBlock(text).closingBlock
  if (!closingBlock) {
    return []
  }

  const lines = closingBlock
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const signatureLines = lines.slice(1)
  const signatureName = signatureLines.at(-1)
  if (!signatureName || !isLikelyTeacherSignatureName(signatureName, language)) {
    return []
  }

  return signatureLines
}

function extractCandidateSignatureLines(text: string) {
  const closingBlock = extractTrailingClosingBlock(text).closingBlock
  if (!closingBlock) {
    return []
  }

  return closingBlock
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

export function isOutputWorseThanSource(options: {
  sourceText: string
  candidateText: string
  sourceViolations: DraftQualityViolation[]
  candidateViolations: DraftQualityViolation[]
  similarity: number
  sourceWordCount: number
  candidateWordCount: number
}) {
  const sourceHasBlockingViolations = options.sourceViolations.some(
    (violation) => violation.severity === "blocking",
  )
  const candidateHasAdvisoryViolations = options.candidateViolations.some(
    (violation) => violation.severity === "advisory",
  )

  return (
    !sourceHasBlockingViolations &&
    candidateHasAdvisoryViolations &&
    options.similarity >= 0.85 &&
    options.candidateWordCount > options.sourceWordCount
  )
}

export function evaluateDraftQuality(options: {
  sourceText: string
  candidateText: string
  language: DraftLanguage
  teacherDraftMode: boolean
  requestedSignatureName?: string
  safetyAnalysis?: SafetyEngineOutput | null
  lengthTarget?: LengthTarget
}): DraftQualityResult {
  const similarity = getWordSequenceSimilarity(options.sourceText, options.candidateText)
  const wordCount = countWords(options.candidateText)

  if (!options.teacherDraftMode) {
    return {
      verdict: "improved",
      violations: [],
      passedChecks: [],
      similarity,
      wordCount,
    }
  }

  const { sourceText, candidateText, language, requestedSignatureName } = options
  const sourceWordCount = countWords(sourceText)
  const candidateWordCount = wordCount
  const violations: DraftQualityViolation[] = []
  const pushViolation = (
    category: DraftQualityCategory,
    phrase: string,
    severity: "blocking" | "advisory",
  ) => {
    const duplicate = violations.some(
      (entry) =>
        entry.category === category &&
        entry.phrase === phrase &&
        entry.severity === severity,
    )
    if (!duplicate) {
      violations.push({ category, phrase, severity })
    }
  }

  collectIntroducedPatternMatches(sourceText, candidateText, TEACHER_DRAFT_FABRICATION_PHRASES).forEach(
    (phrase) => {
      pushViolation("FABRICATION", phrase, "blocking")
    },
  )

  collectPatternMatches(candidateText, TEACHER_DRAFT_DEFENSIVE_PATTERNS).forEach((phrase) => {
    pushViolation("DEFENSIVE_PHRASE", phrase, "blocking")
  })

  collectPatternMatches(candidateText, TEACHER_DRAFT_GENERIC_FILLER_PATTERNS).forEach((phrase) => {
    pushViolation("GENERIC_FILLER", phrase, "blocking")
  })

  const sourceHasFirmBoundary = SOURCE_FIRM_BOUNDARY_PATTERN.test(sourceText)
  const candidateHasFirmBoundary = SOURCE_FIRM_BOUNDARY_PATTERN.test(candidateText)
  if (sourceHasFirmBoundary && BOUNDARY_DILUTION_PATTERN.test(candidateText)) {
    pushViolation("BOUNDARY_DILUTION", "firm boundary was diluted", "blocking")
  }

  if (
    INCONSISTENT_FIRM_MARKERS_PATTERN.test(candidateText) &&
    INCONSISTENT_HEDGE_MARKERS_PATTERN.test(candidateText)
  ) {
    pushViolation(
      "INCONSISTENT_FRAMING",
      "Message contains both firm and hedged language — parent may perceive ambiguity",
      "advisory",
    )
  }

  if (sourceHasFirmBoundary && CANDIDATE_HEDGING_PATTERN.test(candidateText) && !candidateHasFirmBoundary) {
    pushViolation("OVER_SOFTENING", "firm boundary became hedged", "blocking")
  }

  if (candidateWordCount > Math.ceil(sourceWordCount * 1.4)) {
    pushViolation("MESSAGE_EXPANSION", "candidate expanded beyond 40%", "advisory")
  }

  collectPatternMatches(candidateText, GENERIC_REASSURANCE_FILLER_PATTERNS).forEach((phrase) => {
    pushViolation("GENERIC_REASSURANCE_FILLER", phrase, "advisory")
  })

  if (language === "en") {
    detectRegisterViolations(candidateText).forEach((violation) => {
      pushViolation("REGISTER_ACCURACY", violation.phrase, "blocking")
    })
  }

  const sourceExplanationSentences = splitSentences(sourceText).filter((sentence) =>
    EXPLANATION_PATTERN.test(sentence),
  ).length
  const candidateExplanationSentences = splitSentences(candidateText).filter((sentence) =>
    EXPLANATION_PATTERN.test(sentence),
  ).length
  if (sourceExplanationSentences === 0 && candidateExplanationSentences >= 2) {
    pushViolation("OVER_EXPLANATION", "additional justification sentences introduced", "advisory")
  }

  if (
    !requestedSignatureName &&
    normalizeSignatureLines(extractTeacherDraftSignatureLines(sourceText, language)) &&
    normalizeSignatureLines(extractTeacherDraftSignatureLines(sourceText, language)) !==
      normalizeSignatureLines(extractCandidateSignatureLines(candidateText))
  ) {
    pushViolation("SIGNATURE_DRIFT", "sign-off changed", "blocking")
  }

  if (
    hasTeacherDraftAcknowledgementNeed(sourceText) &&
    !hasTeacherDraftAcknowledgement(candidateText, language)
  ) {
    pushViolation("MISSING_ACKNOWLEDGEMENT", "brief acknowledgement missing", "blocking")
  }

  const sourceIntent = classifyTeacherIntent(sourceText)
  const candidateIntent = classifyTeacherIntent(candidateText)
  const intentCheck = checkIntentPreservation({
    sourceIntent,
    candidateIntent,
    sourceText,
    candidateText,
  })
  if (!intentCheck.preserved && intentCheck.violation) {
    pushViolation("INTENT_DRIFT", intentCheck.violation.description, "blocking")
  }

  const sourceProfile = extractVoiceProfile(sourceText)
  const candidateProfile = extractVoiceProfile(candidateText)
  const voiceCheck = checkVoicePreservation({
    sourceProfile,
    candidateProfile,
  })
  voiceCheck.violations.forEach((violation) => {
    pushViolation(violation.type, violation.description, "advisory")
  })

  if (options.lengthTarget && wordCount > options.lengthTarget.maxWords) {
    pushViolation(
      "LENGTH_EXCEEDED",
      `Output ${wordCount} words exceeds target max ${options.lengthTarget.maxWords}`,
      "advisory",
    )
  }

  const categoriesInViolations = new Set(violations.map((violation) => violation.category))
  const allChecks: DraftQualityCheckName[] = [
    "FABRICATION",
    "DEFENSIVE_PHRASE",
    "GENERIC_FILLER",
    "BOUNDARY_DILUTION",
    "INCONSISTENT_FRAMING",
    "OVER_SOFTENING",
    "MESSAGE_EXPANSION",
    "GENERIC_REASSURANCE_FILLER",
    "OVER_EXPLANATION",
    "REGISTER_ACCURACY",
    "INTENT_DRIFT",
    "SENTENCE_LENGTH_DRIFT",
    "FORMALITY_DRIFT",
    "PERSON_DRIFT",
    "LENGTH_EXCEEDED",
    "SIGNATURE_DRIFT",
    "MISSING_ACKNOWLEDGEMENT",
  ]
  const passedChecks = allChecks.filter((check) => !categoriesInViolations.has(check))

  const blockingViolations = violations.filter((violation) => violation.severity === "blocking")
  const advisoryViolations = violations.filter((violation) => violation.severity === "advisory")
  const hasFabrication = blockingViolations.some((violation) => violation.category === "FABRICATION")
  const withinTenPercent =
    sourceWordCount === 0
      ? candidateWordCount === 0
      : candidateWordCount <= Math.ceil(sourceWordCount * 1.1)

  let verdict: DraftQualityResult["verdict"] = "improved"
  if (
    blockingViolations.length === 0 &&
    advisoryViolations.length === 0 &&
    withinTenPercent &&
    !hasFabrication
  ) {
    verdict = "already_strong"
  } else if (blockingViolations.length > 0 || advisoryViolations.length >= 3) {
    verdict = "needs_rewrite"
  } else {
    verdict = "improved"
  }

  return {
    verdict,
    violations,
    passedChecks,
    similarity,
    wordCount,
  }
}
