const OUT_OF_SCOPE_PHRASES = [
  "bake a chocolate cake",
  "chocolate cake",
  "cook",
  "recipe",
  "car battery",
  "change a car battery",
  "travel",
  "vacation",
  "trip",
  "visit thailand",
  "best time to visit",
  "leftover chilli",
  "chilli con carne",
  "gedicht",
  "kaffee-kuchen",
  "hauptstadt",
  "bake",
  "baking",
  "muffins",
  "cake",
  "cookies",
  "capital of",
  "capital",
  "weather",
  "backen",
  "rezept",
  "kuchen",
  "kekse",
  "wetter",
  "reisen",
]

const OUT_OF_SCOPE_REGEX = OUT_OF_SCOPE_PHRASES.map((phrase) =>
  new RegExp(`\\b${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i"),
)

const ALLOWLIST_TERMS = [
  "lesson",
  "class",
  "students",
  "parent",
  "report",
  "curriculum",
  "homework",
  "assessment",
  "behaviour",
  "behavior",
  "wellbeing",
  "teacher",
  "school",
  "excursion",
  "museum",
]

const ALLOWLIST_REGEX = ALLOWLIST_TERMS.map((term) =>
  new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i"),
)

const EXPLICIT_VERBS = ["write", "draft", "rewrite", "rephrase", "compose", "improve", "generate", "create"]

const SCHOOL_TARGETS = [
  "parent",
  "carer",
  "report",
  "comment",
  "feedback",
  "note",
  "message",
  "email",
  "update",
  "communication",
]

const SCHOOL_INTENT_TERMS = [
  "parent",
  "carer",
  "student",
  "pupil",
  "class",
  "lesson",
  "school",
  "report",
  "progress",
  "behaviour",
  "behavior",
  "attendance",
  "homework",
  "assessment",
  "wellbeing",
  "teacher",
  "eltern",
  "schueler",
  "schule",
  "klasse",
  "unterricht",
  "zeugnis",
  "kommentar",
  "lernstand",
  "fortschritt",
  "verhalten",
  "hausaufgaben",
  "bewertung",
  "anwesenheit",
]

const SCHOOL_INTENT_PHRASES = [
  "elternnachricht",
  "lernfortschritt",
  "lernstandsbericht",
  "zeugniskommentar",
  "berichtskommentar",
  "schuelerbericht",
]

const REPORT_INTENT_TERMS = [
  "report",
  "comment",
  "progress",
  "zeugnis",
  "bericht",
  "kommentar",
  "lernstand",
  "fortschritt",
  "berichtskommentar",
]

const REPORT_INTENT_PHRASES = [
  "zeugniskommentar",
  "berichtskommentar",
  "lernstandsbericht",
]

const IMPLICIT_SCHOOL_PHRASES = [
  "parent message",
  "report comment",
  "student progress",
  "behaviour note",
  "behavior note",
  "wellbeing concern",
  "incident report",
  "excursion note",
  "school update",
  "parent email",
  "elternnachricht",
  "berichtskommentar",
  "lernstandsbericht",
  "lernfortschritt",
  "ausflug",
]

const DIAGNOSTIC_SPECULATION_PATTERNS = [
  /\badhd\b/i,
  /\badd\b/i,
  /\bautism\b/i,
  /\bautism spectrum\b/i,
  /\bautistic\b/i,
  /\bdyslexia\b/i,
  /\banxiety\b/i,
  /\bdepression\b/i,
  /\bodd\b/i,
  /\bsensory processing\b/i,
  /\bi (think|wonder|suspect)\b.{0,40}\b(adhd|add|autism|autistic|autism spectrum|dyslexia|anxiety|depression|odd)\b/i,
  /\b(he|she|they|the child|this child|the student)\b.{0,30}\b(might have|may have|could have|seems to have|might be|could be)\b/i,
]

export function hasDiagnosticSpeculationSignal(text: string) {
  return DIAGNOSTIC_SPECULATION_PATTERNS.some((pattern) => pattern.test(text))
}

function hasSchoolIntentSignal(normalized: string) {
  return (
    hasDiagnosticSpeculationSignal(normalized) ||
    containsAnyWord(normalized, SCHOOL_INTENT_TERMS) ||
    SCHOOL_INTENT_PHRASES.some((phrase) => normalized.includes(phrase)) ||
    IMPLICIT_SCHOOL_PHRASES.some((phrase) => normalized.includes(phrase))
  )
}

function hasReportIntentSignal(normalized: string) {
  return (
    containsAnyWord(normalized, REPORT_INTENT_TERMS) ||
    REPORT_INTENT_PHRASES.some((phrase) => normalized.includes(phrase))
  )
}

function normalizeQuery(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

function containsWord(text: string, word: string) {
  return new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(text)
}

function containsAnyWord(text: string, words: string[]) {
  return words.some((word) => containsWord(text, word))
}

export const OUT_OF_SCOPE_REDIRECT_MESSAGE = `This doesn't look like a school report or parent message.

Zaza Draft is designed to help you write professional, school-appropriate communication for parents, students, and colleagues.

If you'd like help with report comments, parent emails, behaviour or wellbeing notes, or sensitive school communication, paste that text here and I'll help you refine it.`

export function isOutOfScopeQuery(text: string) {
  const normalized = normalizeQuery(text)
  if (hasDiagnosticSpeculationSignal(normalized)) {
    return false
  }
  if (hasSchoolIntentSignal(normalized) || hasReportIntentSignal(normalized)) {
    return false
  }
  const hasAllowlistTerm = ALLOWLIST_REGEX.some((regex) => regex.test(normalized))
  if (hasAllowlistTerm) {
    return false
  }

  return OUT_OF_SCOPE_REGEX.some((regex) => regex.test(normalized))
}

export function isValidDraftRequest(text: string, mode?: string) {
  if (isOutOfScopeQuery(text)) {
    return false
  }

  const normalized = normalizeQuery(text)
  const hasExplicitVerb = containsAnyWord(normalized, EXPLICIT_VERBS)
  const hasSchoolTarget = containsAnyWord(normalized, SCHOOL_TARGETS)

  const hasSchoolIntent = hasSchoolIntentSignal(normalized)
  const hasReportIntent = hasReportIntentSignal(normalized)

  const hasIntent = hasSchoolIntent || hasReportIntent
  const explicitEligible = hasExplicitVerb && hasSchoolTarget && hasIntent
  const implicitEligible = IMPLICIT_SCHOOL_PHRASES.some((phrase) => normalized.includes(phrase))

  if (mode === "parent_message") {
    return hasSchoolIntent || explicitEligible || implicitEligible
  }

  if (mode === "report_comment") {
    return hasReportIntent || hasSchoolIntent || explicitEligible || implicitEligible
  }

  return hasIntent || implicitEligible
}
