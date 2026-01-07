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
  // additional common terms
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

function normalizeQuery(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

export const OUT_OF_SCOPE_REDIRECT_MESSAGE = `This doesn't look like a school report or parent message.

Zaza Draft is designed to help you write professional, school-appropriate communication for parents, students, and colleagues.

If you'd like help with report comments, parent emails, behaviour or wellbeing notes, or sensitive school communication, paste that text here and I'll help you refine it.`

export function isOutOfScopeQuery(text: string) {
  const normalized = normalizeQuery(text)
  const hasAllowlistTerm = ALLOWLIST_REGEX.some((regex) => regex.test(normalized))
  if (hasAllowlistTerm) {
    return false
  }

  return OUT_OF_SCOPE_REGEX.some((regex) => regex.test(normalized))
}

const EXPLICIT_VERBS = ["write", "draft", "rewrite", "rephrase", "compose", "improve", "generate"]
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
  "eltern",
  "schüler",
  "schueler",
  "klasse",
  "unterricht",
  "schule",
  "zeugnis",
  "kommentar",
  "lernstand",
  "fortschritt",
  "verhalten",
  "anwesenheit",
  "hausaufgaben",
  "bewertung",
]

const SCHOOL_INTENT_PHRASES = [
  "elternnachricht",
  "lernfortschritt",
  "lernstandsbericht",
  "zeugniskommentar",
  "schülers",
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

function containsWord(text: string, word: string) {
  return new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(text)
}

function containsAnyWord(text: string, words: string[]) {
  return words.some((word) => containsWord(text, word))
}

export function isValidDraftRequest(text: string, mode?: string) {
  if (isOutOfScopeQuery(text)) {
    return false
  }

  const normalized = normalizeQuery(text)
  const hasExplicitVerb = containsAnyWord(normalized, EXPLICIT_VERBS)
  const hasSchoolTarget = containsAnyWord(normalized, SCHOOL_TARGETS)
  const explicitEligible = hasExplicitVerb && hasSchoolTarget
  const implicitEligible = IMPLICIT_SCHOOL_PHRASES.some((phrase) => normalized.includes(phrase))
  const hasSchoolIntent =
    containsAnyWord(normalized, SCHOOL_INTENT_TERMS) ||
    SCHOOL_INTENT_PHRASES.some((phrase) => normalized.includes(phrase))
  const hasReportIntent =
    containsAnyWord(normalized, REPORT_INTENT_TERMS) ||
    REPORT_INTENT_PHRASES.some((phrase) => normalized.includes(phrase))

  if (mode === "parent_message") {
    return hasSchoolIntent || explicitEligible || implicitEligible
  }

  if (mode === "report_comment") {
    return hasReportIntent || explicitEligible || implicitEligible
  }

  return (explicitEligible || implicitEligible) && (hasSchoolIntent || hasReportIntent)
}
