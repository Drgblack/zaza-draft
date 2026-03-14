import type { DraftMode } from "@/lib/types"
import { formatDraftText } from "./format"

type GenerationInputMode = "safe_draft" | "panic_scan" | "voice_to_calm"

interface SubjectPolicyInput {
  mode: DraftMode
  language?: string | null
  generationMode?: GenerationInputMode | null
  messageType?: string | null
  studentFirstName?: string | null
  situation?: string | null
  contextSubject?: string | null
  existingSubject?: string | null
}

const SUBJECT_PREFIX_RE = /^(?:Subject|Betreff)\s*[:\-–—|]+\s*/i

const REPLACEABLE_FALLBACK_SUBJECTS = {
  en: new Set(["Your child's progress", "Classroom update"]),
  de: new Set(["Ruckmeldung zum Lernen", "Rückmeldung zum Lernen", "Rückmeldung aus dem Unterricht"]),
}

function isGerman(language?: string | null) {
  return Boolean(language?.toLowerCase().startsWith("de"))
}

function normalizeWhitespace(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
}

export function normalizeDraftSubject(value?: string | null) {
  if (!value) {
    return undefined
  }
  const normalized = normalizeWhitespace(value)
    .replace(SUBJECT_PREFIX_RE, "")
    .replace(/\s*[-|:]+\s*$/, "")
    .replace(/\s+[.?!]+$/, "")
    .trim()
  return normalized || undefined
}

function truncateSubject(value: string) {
  if (value.length <= 72) {
    return value
  }
  const words = value.split(/\s+/)
  const kept: string[] = []
  for (const word of words) {
    const next = [...kept, word].join(" ")
    if (next.length > 72) {
      break
    }
    kept.push(word)
  }
  if (kept.length > 0) {
    return kept.join(" ")
  }
  return value.slice(0, 72).trim()
}

function buildPossessive(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`
}

function detectTopicKey(text: string, messageType?: string | null) {
  if (/(bully|bullying|unsafe|safety|safeguard|safeguarding|pushed|hit|hurt|afraid|scared|upset today|incident)/i.test(text)) {
    return "concern_today"
  }
  if (/(homework|assignment|assignments|worksheet|worksheets)/i.test(text)) {
    return "homework"
  }
  if (/(grade|grades|grading|marking|assessment|assessed|marked|test score|exam|result)/i.test(text)) {
    return "assessment"
  }
  if (/(reading|phonics|literacy|guided reading|book|books)/i.test(text)) {
    return "reading"
  }
  if (/\b(math|maths|mathematics)\b/i.test(text)) {
    return "maths"
  }
  if (/(behaviour|behavior|conduct|disruption|disruptive|classroom behaviour|classroom behavior)/i.test(text)) {
    return "behaviour"
  }
  if (/(attendance|absence|absent|late|lateness)/i.test(text)) {
    return "attendance"
  }
  if (messageType === "parent_complaint" || messageType === "student_concern") {
    return "concern_today"
  }
  return "general_update"
}

function buildEnglishSubject(topicKey: string, studentFirstName?: string | null) {
  const student = normalizeWhitespace(studentFirstName ?? "")
  switch (topicKey) {
    case "homework":
      return student ? `Update on ${buildPossessive(student)} homework` : "Update on homework"
    case "assessment":
      return student ? `Assessment update for ${student}` : "Assessment update"
    case "reading":
      return student ? `Update on ${buildPossessive(student)} reading` : "Reading update"
    case "maths":
      return student ? `Update on ${student}'s maths lesson` : "Update on today's maths lesson"
    case "behaviour":
      return student ? `Update on ${student}'s behaviour in class` : "Update on behaviour in class"
    case "attendance":
      return student ? `Attendance update for ${student}` : "Attendance update"
    case "concern_today":
      return student ? `Follow-up on today's concern about ${student}` : "Follow-up on today's concern"
    default:
      return student ? `Update on ${student}` : "Classroom update"
  }
}

function buildGermanSubject(topicKey: string, studentFirstName?: string | null) {
  const student = normalizeWhitespace(studentFirstName ?? "")
  switch (topicKey) {
    case "homework":
      return student ? `Rückmeldung zu den Hausaufgaben von ${student}` : "Rückmeldung zu den Hausaufgaben"
    case "assessment":
      return student ? `Rückmeldung zur Bewertung von ${student}` : "Rückmeldung zur Bewertung"
    case "reading":
      return student ? `Rückmeldung zum Lesen von ${student}` : "Rückmeldung zum Lesen"
    case "maths":
      return student ? `Rückmeldung zum Mathematikunterricht von ${student}` : "Rückmeldung zum Mathematikunterricht"
    case "behaviour":
      return student ? `Rückmeldung zum Verhalten von ${student}` : "Rückmeldung zum Verhalten im Unterricht"
    case "attendance":
      return student ? `Rückmeldung zur Anwesenheit von ${student}` : "Rückmeldung zur Anwesenheit"
    case "concern_today":
      return student ? `Rückmeldung zu einem Anliegen zu ${student}` : "Rückmeldung zu einem Anliegen von heute"
    default:
      return student ? `Rückmeldung zu ${student}` : "Rückmeldung aus dem Unterricht"
  }
}

function isReplaceableFallbackSubject(subject: string | undefined, language?: string | null) {
  if (!subject) {
    return false
  }
  const localeKey = isGerman(language) ? "de" : "en"
  return REPLACEABLE_FALLBACK_SUBJECTS[localeKey].has(subject)
}

export function resolveDraftSubject(input: SubjectPolicyInput) {
  if (input.mode !== "parent_message") {
    return undefined
  }

  const explicitSubject = normalizeDraftSubject(input.contextSubject)
  if (explicitSubject) {
    return truncateSubject(explicitSubject)
  }

  const existingSubject = normalizeDraftSubject(input.existingSubject)
  if (existingSubject && !isReplaceableFallbackSubject(existingSubject, input.language)) {
    return truncateSubject(existingSubject)
  }

  const topicKey = detectTopicKey(input.situation ?? "", input.messageType)
  const derived = isGerman(input.language)
    ? buildGermanSubject(topicKey, input.studentFirstName)
    : buildEnglishSubject(topicKey, input.studentFirstName)

  if (derived) {
    return truncateSubject(derived)
  }

  return existingSubject ? truncateSubject(existingSubject) : undefined
}

export function applyModeAwareSubjectLine(text: string, input: SubjectPolicyInput) {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return text
  }

  const parsed = formatDraftText(normalized, input.language ?? undefined)

  if (input.mode === "report_comment") {
    if (!parsed.subject) {
      return normalized
    }
    return parsed.paragraphs.join("\n\n").trim()
  }

  if (input.mode !== "parent_message") {
    return normalized
  }

  const resolvedSubject = resolveDraftSubject({
    ...input,
    existingSubject: parsed.subject,
  })
  if (!resolvedSubject) {
    return normalized
  }

  const existingSubject = normalizeDraftSubject(parsed.subject)
  if (existingSubject === resolvedSubject && parsed.subject) {
    return normalized
  }

  const label = isGerman(input.language) ? "Betreff" : "Subject"
  const body = parsed.paragraphs.join("\n\n").trim()
  return body ? `${label}: ${resolvedSubject}\n\n${body}` : `${label}: ${resolvedSubject}`
}
