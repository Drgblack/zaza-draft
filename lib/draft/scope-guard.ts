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
  "guardian",
  "guardians",
  "classroom",
  "session",
  "sessions",
  "online session",
  "disruptive",
  "pastoral",
  "sen",
  "iep",
  "marking",
  "detention",
  "tutor",
  "head of year",
  "intervention",
  "attendance",
  "safeguarding",
  "pupil",
  "pupils",
  "learner",
  "learners",
  "key stage",
  "year group",
  "form group",
  "assembly",
  "playground",
  "pe lesson",
  "assignment",
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
  "guardian",
  "guardians",
  "student",
  "pupil",
  "pupils",
  "learner",
  "learners",
  "class",
  "classroom",
  "lesson",
  "session",
  "sessions",
  "school",
  "report",
  "progress",
  "behaviour",
  "behavior",
  "disruptive",
  "focus",
  "distracted",
  "concentration",
  "attention",
  "engagement",
  "attendance",
  "homework",
  "assessment",
  "wellbeing",
  "teacher",
  "pastoral",
  "sen",
  "iep",
  "marking",
  "detention",
  "tutor",
  "intervention",
  "safeguarding",
  "assignment",
  "assembly",
  "playground",
  "reading time",
  "writing time",
  "group work",
  "independent work",
  "struggling",
  "improving",
  "progressing",
  "settled",
  "unsettled",
  "at home",
  "going on at home",
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
  "online session",
  "head of year",
  "key stage",
  "year group",
  "form group",
  "pe lesson",
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
  "behaviour update",
  "wellbeing concern",
  "incident report",
  "excursion note",
  "school update",
  "parent email",
  "parent communication",
  "progress report",
  "parent meeting",
  "guardian meeting",
  "urgent action",
  "needs to be taken",
  "guardian to guarantee",
  "elternnachricht",
  "berichtskommentar",
  "lernstandsbericht",
  "lernfortschritt",
  "ausflug",
]

const SCHOOL_SIGNAL_CATEGORIES = {
  person: ["student", "students", "pupil", "pupils", "learner", "learners", "child", "children", "kid", "kids"],
  action: [
    "lesson",
    "lessons",
    "session",
    "sessions",
    "class",
    "classes",
    "reading time",
    "writing time",
    "group work",
    "independent work",
    "meeting",
    "meetings",
    "assembly",
    "detention",
    "intervention",
    "marking",
    "assignment",
  ],
  authority: [
    "guardian",
    "guardians",
    "parent",
    "parents",
    "carer",
    "carers",
    "teacher",
    "teachers",
    "tutor",
    "tutors",
    "head",
    "headteacher",
    "head of year",
  ],
  concern: [
    "behaviour",
    "behavior",
    "disruptive",
    "focus",
    "distracted",
    "concentration",
    "attention",
    "engagement",
    "struggling",
    "improving",
    "progressing",
    "settled",
    "unsettled",
    "urgent",
    "action",
    "concern",
    "concerns",
    "support",
    "incident",
    "at home",
    "going on at home",
  ],
} as const

const NAME_LIKE_PATTERN = /\b([A-Z][a-z]{2,})(?:'s)?\b/
const NON_NAME_TOKENS = new Set([
  "After",
  "Before",
  "Buy",
  "Create",
  "Draft",
  "Form",
  "Generate",
  "He",
  "Her",
  "His",
  "How",
  "I",
  "If",
  "Improve",
  "In",
  "It",
  "Need",
  "Online",
  "Please",
  "Rewrite",
  "Session",
  "She",
  "The",
  "This",
  "Today",
  "Urgent",
  "We",
  "What",
  "Write",
])

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

function hasNameLikeStudentSignal(text: string) {
  const matches = text.match(/\b([A-Z][a-z]{2,})(?:'s)?\b/g) ?? []
  return matches.some((match) => {
    const normalizedToken = match.replace(/'s$/i, "")
    return NAME_LIKE_PATTERN.test(match) && !NON_NAME_TOKENS.has(normalizedToken)
  })
}

function hasMultiSignalSchoolContext(text: string, normalized: string) {
  const matchedCategories = new Set<string>()

  if (
    containsAnyWord(normalized, SCHOOL_SIGNAL_CATEGORIES.person) ||
    hasNameLikeStudentSignal(text)
  ) {
    matchedCategories.add("person")
  }

  if (containsAnyWord(normalized, SCHOOL_SIGNAL_CATEGORIES.action)) {
    matchedCategories.add("action")
  }

  if (containsAnyWord(normalized, SCHOOL_SIGNAL_CATEGORIES.authority)) {
    matchedCategories.add("authority")
  }

  if (containsAnyWord(normalized, SCHOOL_SIGNAL_CATEGORIES.concern)) {
    matchedCategories.add("concern")
  }

  return matchedCategories.size >= 2
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

function containsAnyWord(text: string, words: readonly string[]) {
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
  if (hasMultiSignalSchoolContext(text, normalized)) {
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
  const hasMultiSignalContext = hasMultiSignalSchoolContext(text, normalized)

  const hasIntent = hasSchoolIntent || hasReportIntent || hasMultiSignalContext
  const explicitEligible = hasExplicitVerb && hasSchoolTarget && hasIntent
  const implicitEligible = IMPLICIT_SCHOOL_PHRASES.some((phrase) => normalized.includes(phrase))

  if (mode === "parent_message") {
    return hasSchoolIntent || hasMultiSignalContext || explicitEligible || implicitEligible
  }

  if (mode === "report_comment") {
    return hasReportIntent || hasSchoolIntent || hasMultiSignalContext || explicitEligible || implicitEligible
  }

  return hasIntent || implicitEligible
}
