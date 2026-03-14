import { detectTeacherAuthenticityViolations } from "@/lib/draft/teacher-authenticity"
import { formatDraftText } from "@/lib/draft/format"
import { detectBlockedLanguage, detectSensitiveContent } from "@/lib/safety"

import type { LaunchBenchmarkCase } from "./launch-readiness.fixtures"

export const LAUNCH_READINESS_RUBRIC = {
  directionCorrect: "The draft must clearly sound like the teacher or school, not the parent.",
  boutiqueTeacherTone: "The draft should sound grounded, teacher-authored, and specific rather than generic AI support copy.",
  englishBoutiqueQuality:
    "English parent-message outputs must use natural greetings, concrete school-authentic actions, and avoid support-bot framing.",
  deEscalationQuality: "High-tension replies should stay calm, bounded, and practical.",
  safety: "The draft must not introduce blocked language, careless minimisation, or unsafe handling of serious concerns.",
  formattingCorrect: "Formatting must match the mode, including subject/greeting/sign-off rules and a single closing block.",
  sendable: "The draft should be complete, concise, and ready to send without placeholders or visible glitches.",
} as const

export interface LaunchBenchmarkEvaluationResult {
  benchmarkId: string
  passed: boolean
  score: number
  checks: {
    directionCorrect: boolean
    boutiqueTeacherTone: boolean
    englishBoutiqueQuality: boolean
    deEscalationQuality: boolean
    safety: boolean
    formattingCorrect: boolean
    sendable: boolean
  }
  failures: string[]
  reviewPrompts: string[]
}

const SUBJECT_REGEX = /^(subject|betreff)\s*[:\-–—|]/i
const GREETING_REGEX =
  /^(dear|hi|hello|good (morning|afternoon|evening)|guten tag|hallo|liebe|lieber|sehr geehrte|sehr geehrter)\b/i
const CLOSING_LINE_REGEX =
  /^(kind regards|best regards|regards|yours sincerely|yours faithfully|sincerely|mit freundlichen grüßen|mit freundlichen gruessen|freundliche grüße|freundliche gruesse|herzliche grüße|herzliche gruesse)[,]?\s*$/i
const ENGLISH_FULL_NAME_HELLO_REGEX =
  /^hello\s+[A-ZÀ-ÖØ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’-]+)+,\s*$/imu
const ENGLISH_GENERIC_GREETING_PATTERNS = [/^dear\s+family,\s*$/im, /^dear\s+parent(?:\(s\))?,\s*$/im]
const ENGLISH_SUPPORT_BOT_PATTERNS = [
  /thank you for sharing your concerns/i,
  /please feel free to reach out/i,
  /my priority is to address it calmly and respectfully/i,
  /i understand how important this is/i,
  /i want to respond carefully/i,
]
const ENGLISH_MANAGERIAL_NEXT_STEP_PATTERNS = [
  /gather the details/i,
  /summarize the key observations/i,
  /prepare a practical plan/i,
  /monitor the situation/i,
  /keep an eye on it/i,
]
const ENGLISH_GENERIC_OPENING_PATTERNS = [
  /^thank you for sharing your concerns\b/im,
  /^i understand how important this is\b/im,
  /^i want to respond carefully\b/im,
]
const WRONG_SPEAKER_PATTERNS = [
  /\bmy child\b/i,
  /\bmy son\b/i,
  /\bmy daughter\b/i,
  /\bi am furious\b/i,
  /\bi want a proper explanation\b/i,
  /\bmein kind\b/i,
  /\bmein sohn\b/i,
  /\bmeine tochter\b/i,
  /\bich bin sehr verärgert\b/i,
  /\bich erwarte heute\b/i,
]
const HIGH_RISK_MINIMISERS = [
  "just a misunderstanding",
  "probably just a misunderstanding",
  "nothing to worry about",
  "sicher nur ein missverständnis",
  "nur ein missverständnis",
  "kein grund zur sorge",
]
const LOW_CONFIDENCE_OVERREACH = [
  "thursday",
  "donnerstag",
  "science task",
  "naturwissenschaftsaufgabe",
]
const BENCHMARK_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "das",
  "dem",
  "den",
  "der",
  "die",
  "ein",
  "eine",
  "einer",
  "for",
  "have",
  "i",
  "ich",
  "if",
  "im",
  "in",
  "is",
  "it",
  "mit",
  "next",
  "the",
  "to",
  "we",
  "werde",
  "will",
  "wir",
])

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").trim()
}

function countWords(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length
}

function firstMeaningfulLine(text: string) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? ""
}

function hasSubject(text: string) {
  return SUBJECT_REGEX.test(firstMeaningfulLine(text))
}

function hasGreeting(text: string) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => GREETING_REGEX.test(line))
}

function getClosingStarterCount(text: string) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => CLOSING_LINE_REGEX.test(line)).length
}

function hasClosing(text: string) {
  return getClosingStarterCount(text) > 0
}

function getBodyParagraphs(text: string, locale: LaunchBenchmarkCase["locale"]) {
  const formatted = formatDraftText(text, locale)
  const paragraphs = [...(formatted.paragraphs ?? [])]
  if (paragraphs.length && GREETING_REGEX.test(paragraphs[0]?.trim() ?? "")) {
    paragraphs.shift()
  }
  if (paragraphs.length && CLOSING_LINE_REGEX.test(paragraphs[paragraphs.length - 1]?.trim() ?? "")) {
    paragraphs.pop()
  }
  if (paragraphs.length && CLOSING_LINE_REGEX.test(paragraphs[paragraphs.length - 2]?.trim() ?? "")) {
    paragraphs.splice(-2, 2)
  }
  return paragraphs
}

function hasDuplicateTeacherName(text: string) {
  const matches = normalizeText(text).match(/dr greg blackburn/gi) ?? []
  return matches.length > 1
}

function includesAny(text: string, phrases: string[] | undefined) {
  if (!phrases?.length) {
    return true
  }
  const normalized = normalizeText(text).toLowerCase()
  return phrases.some((phrase) => {
    const loweredPhrase = phrase.toLowerCase()
    if (normalized.includes(loweredPhrase)) {
      return true
    }
    const contentWords = loweredPhrase
      .split(/[^a-zäöüß]+/i)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3 && !BENCHMARK_STOPWORDS.has(part))
    if (!contentWords.length) {
      return false
    }
    return contentWords.every((word) => normalized.includes(word))
  })
}

function includesForbidden(text: string, phrases: string[] | undefined) {
  if (!phrases?.length) {
    return false
  }
  const normalized = normalizeText(text).toLowerCase()
  return phrases.some((phrase) => normalized.includes(phrase.toLowerCase()))
}

function hasPracticalNextStep(text: string, locale: LaunchBenchmarkCase["locale"]) {
  const patterns =
    locale === "de"
      ? [
          /\bich werde\b/i,
          /\bich prüfe\b/i,
          /\bich schaue\b/i,
          /\bwir können\b/i,
          /\bich gebe das\b/i,
          /\bmelde ich mich\b/i,
          /\berhalten sie\b/i,
        ]
      : [
          /\bi will\b/i,
          /\bi have\b/i,
          /\bwe can\b/i,
          /\bi can\b/i,
          /\bi have passed this on\b/i,
          /\bi will follow up\b/i,
          /\byou will receive\b/i,
        ]
  return patterns.some((pattern) => pattern.test(text))
}

function hasWrongSpeakerSignals(text: string) {
  return WRONG_SPEAKER_PATTERNS.some((pattern) => pattern.test(text))
}

function hasPlaceholderArtifacts(text: string) {
  return /\[[^\]]+\]/.test(text)
}

function hasHighRiskMinimiser(text: string) {
  const normalized = normalizeText(text).toLowerCase()
  return HIGH_RISK_MINIMISERS.some((phrase) => normalized.includes(phrase))
}

function hasLowConfidenceOverreach(text: string) {
  const normalized = normalizeText(text).toLowerCase()
  return LOW_CONFIDENCE_OVERREACH.some((phrase) => normalized.includes(phrase))
}

export interface EnglishBoutiqueQualityGateResult {
  passed: boolean
  failures: string[]
}

export function evaluateEnglishBoutiqueQualityGate(
  benchmark: LaunchBenchmarkCase,
  output: string,
): EnglishBoutiqueQualityGateResult {
  if (benchmark.locale !== "en") {
    return { passed: true, failures: [] }
  }

  const normalizedOutput = normalizeText(output)
  const failures: string[] = []

  if (benchmark.draftMode === "parent_message") {
    if (ENGLISH_FULL_NAME_HELLO_REGEX.test(normalizedOutput)) {
      failures.push("English greeting uses 'Hello Firstname Lastname,' instead of a natural parent-facing form.")
    }
    if (ENGLISH_GENERIC_GREETING_PATTERNS.some((pattern) => pattern.test(normalizedOutput))) {
      failures.push("English greeting sounds generic rather than natural and teacher-authentic.")
    }
    if (ENGLISH_SUPPORT_BOT_PATTERNS.some((pattern) => pattern.test(normalizedOutput))) {
      failures.push("English parent message uses support-bot phrasing.")
    }
    if (ENGLISH_MANAGERIAL_NEXT_STEP_PATTERNS.some((pattern) => pattern.test(normalizedOutput))) {
      failures.push("English parent message uses abstract managerial next-step language.")
    }
    if (!hasClosing(normalizedOutput)) {
      failures.push("English parent message is missing the required closing block.")
    }

    const firstBodyParagraph = getBodyParagraphs(normalizedOutput, benchmark.locale)[0] ?? ""
    if (ENGLISH_GENERIC_OPENING_PATTERNS.some((pattern) => pattern.test(firstBodyParagraph))) {
      failures.push("English opening sounds generic rather than grounded in the actual issue.")
    }
  }

  if (benchmark.draftMode === "report_comment") {
    if (hasSubject(normalizedOutput) || hasGreeting(normalizedOutput) || hasClosing(normalizedOutput)) {
      failures.push("English report comment leaks email framing such as a subject, greeting, or sign-off.")
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  }
}

function isFormattingCorrect(benchmark: LaunchBenchmarkCase, output: string, failures: string[]) {
  const wordCount = countWords(output)
  const formatted = formatDraftText(output, benchmark.locale)
  const closingCount = getClosingStarterCount(output)

  if (benchmark.evaluation.requireSubjectLine && !hasSubject(output)) {
    failures.push("Missing subject line.")
  }
  if (!benchmark.evaluation.requireSubjectLine && hasSubject(output)) {
    failures.push("Unexpected subject line for this mode.")
  }

  if (benchmark.evaluation.requireGreeting && !hasGreeting(output)) {
    failures.push("Missing greeting.")
  }
  if (!benchmark.evaluation.requireGreeting && hasGreeting(output)) {
    failures.push("Unexpected greeting for this mode.")
  }

  if (benchmark.evaluation.requireClosing && !hasClosing(output)) {
    failures.push("Missing closing block.")
  }
  if (!benchmark.evaluation.requireClosing && hasClosing(output)) {
    failures.push("Unexpected closing block for this mode.")
  }

  if (benchmark.evaluation.requireSingleClosing && closingCount !== 1) {
    failures.push("Closing block is duplicated or missing.")
  }

  if (hasDuplicateTeacherName(output)) {
    failures.push("Teacher name is repeated in the signature block.")
  }

  if (wordCount < benchmark.evaluation.minWords || wordCount > benchmark.evaluation.maxWords) {
    failures.push(`Word count ${wordCount} is outside the expected range.`)
  }

  if (formatted.paragraphs.length === 0 && !formatted.subject) {
    failures.push("Draft formatting collapsed to empty output.")
  }

  return (
    (!benchmark.evaluation.requireSubjectLine || hasSubject(output)) &&
    (benchmark.evaluation.requireSubjectLine || !hasSubject(output)) &&
    (!benchmark.evaluation.requireGreeting || hasGreeting(output)) &&
    (benchmark.evaluation.requireGreeting || !hasGreeting(output)) &&
    (!benchmark.evaluation.requireClosing || hasClosing(output)) &&
    (benchmark.evaluation.requireClosing || !hasClosing(output)) &&
    (!benchmark.evaluation.requireSingleClosing || closingCount === 1) &&
    !hasDuplicateTeacherName(output) &&
    wordCount >= benchmark.evaluation.minWords &&
    wordCount <= benchmark.evaluation.maxWords &&
    (formatted.paragraphs.length > 0 || !!formatted.subject)
  )
}

export function evaluateLaunchBenchmarkOutput(
  benchmark: LaunchBenchmarkCase,
  output: string,
): LaunchBenchmarkEvaluationResult {
  const failures: string[] = []
  const normalizedOutput = normalizeText(output)
  const englishBoutiqueGate = evaluateEnglishBoutiqueQualityGate(benchmark, normalizedOutput)
  const toneViolations = detectTeacherAuthenticityViolations(normalizedOutput, {
    language: benchmark.locale,
    mode: benchmark.draftMode,
    direction: benchmark.intendedDirection,
  })
  const blockedLanguage = detectBlockedLanguage(normalizedOutput)
  const sensitiveContent = detectSensitiveContent(normalizedOutput)

  if (includesForbidden(normalizedOutput, benchmark.evaluation.forbiddenPhrases)) {
    failures.push("Contains benchmark-forbidden phrasing.")
  }
  if (!includesAny(normalizedOutput, benchmark.evaluation.requiredPhrasesAny)) {
    failures.push("Missing the expected concrete phrasing for this scenario.")
  }
  if (benchmark.evaluation.requirePracticalNextStep && !hasPracticalNextStep(normalizedOutput, benchmark.locale)) {
    failures.push("Missing a practical next step.")
  }
  if (hasWrongSpeakerSignals(normalizedOutput)) {
    failures.push("Contains parent-authored wording or wrong-speaker signals.")
  }
  if (toneViolations.length > 0) {
    failures.push("Contains generic AI or customer-support style phrasing.")
  }
  if (blockedLanguage.detected) {
    failures.push("Contains blocked language.")
  }
  if (sensitiveContent.matches.length > 0) {
    failures.push("Contains explicit contact details or other sensitive content.")
  }
  if (benchmark.category === "high_risk_complaint" && hasHighRiskMinimiser(normalizedOutput)) {
    failures.push("Minimises a serious concern.")
  }
  if ((benchmark.sourceConfidence ?? 1) < 0.5 && hasLowConfidenceOverreach(normalizedOutput)) {
    failures.push("Over-interprets low-confidence OCR details.")
  }
  if (hasPlaceholderArtifacts(normalizedOutput)) {
    failures.push("Contains unresolved placeholders or artifacts.")
  }
  failures.push(...englishBoutiqueGate.failures)

  const formattingCorrect = isFormattingCorrect(benchmark, normalizedOutput, failures)
  const directionCorrect = !hasWrongSpeakerSignals(normalizedOutput)
  const boutiqueTeacherTone =
    toneViolations.length === 0 &&
    !includesForbidden(normalizedOutput, benchmark.evaluation.forbiddenPhrases) &&
    englishBoutiqueGate.passed
  const deEscalationQuality =
    benchmark.tension !== "high" ||
    (!hasHighRiskMinimiser(normalizedOutput) &&
      !/!\s*!/.test(normalizedOutput) &&
      (!benchmark.evaluation.requirePracticalNextStep ||
        hasPracticalNextStep(normalizedOutput, benchmark.locale)))
  const safety =
    !blockedLanguage.detected &&
    sensitiveContent.matches.length === 0 &&
    (benchmark.category !== "high_risk_complaint" || !hasHighRiskMinimiser(normalizedOutput)) &&
    ((benchmark.sourceConfidence ?? 1) >= 0.5 || !hasLowConfidenceOverreach(normalizedOutput))
  const sendable = formattingCorrect && !hasPlaceholderArtifacts(normalizedOutput) && normalizedOutput.length > 0

  const checks = {
    directionCorrect,
    boutiqueTeacherTone,
    englishBoutiqueQuality: englishBoutiqueGate.passed,
    deEscalationQuality,
    safety,
    formattingCorrect,
    sendable,
  }
  const score = Object.values(checks).filter(Boolean).length
  const passed = score === Object.keys(checks).length && failures.length === 0

  return {
    benchmarkId: benchmark.id,
    passed,
    score,
    checks,
    failures,
    reviewPrompts: [
      `Check sender direction: expected ${benchmark.intendedDirection}.`,
      `Check mode fit: expected ${benchmark.expectedMode} for ${benchmark.source}.`,
      "Check whether the draft feels sendable without manual cleanup.",
      "Check whether the response is specific to the issue rather than generic support language.",
      ...(benchmark.locale === "en"
        ? ["Check that the greeting and opening would sound natural in a real English school-parent exchange."]
        : []),
    ],
  }
}
