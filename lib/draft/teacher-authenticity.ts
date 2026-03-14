import type { DraftLanguage, DraftMode } from "@/lib/types"
import type { MessageDirection } from "@/lib/generation/classification"

export type TeacherAuthenticityViolationType =
  | "generic_empathy"
  | "customer_support"
  | "abstract_next_step"
  | "corporate_tone"

export interface TeacherAuthenticityViolation {
  type: TeacherAuthenticityViolationType
  phrase: string
}

interface PhraseRule {
  phrase: string
  type: TeacherAuthenticityViolationType
  modes?: DraftMode[]
}

interface TeacherAuthenticityOptions {
  language: DraftLanguage
  mode: DraftMode
  direction: MessageDirection
  sourceText?: string | null
}

const ENGLISH_RULES: PhraseRule[] = [
  { phrase: "thank you for sharing your concerns", type: "generic_empathy" },
  { phrase: "thank you for raising this with me", type: "customer_support" },
  { phrase: "i understand how important this is", type: "generic_empathy" },
  { phrase: "i understand how overwhelming this feels", type: "generic_empathy" },
  { phrase: "it might be helpful to discuss", type: "abstract_next_step" },
  { phrase: "please feel free to reach out", type: "customer_support" },
  { phrase: "i want to respond carefully", type: "corporate_tone" },
  { phrase: "i want to reply with care", type: "corporate_tone" },
  { phrase: "my priority is to address it calmly and respectfully", type: "corporate_tone" },
  { phrase: "gather the details", type: "abstract_next_step" },
  { phrase: "gather more details", type: "abstract_next_step" },
  { phrase: "summarize the key observations", type: "abstract_next_step" },
  { phrase: "prepare a practical plan", type: "abstract_next_step" },
  { phrase: "monitor the situation", type: "abstract_next_step" },
  { phrase: "keep an eye on it", type: "abstract_next_step" },
  { phrase: "work with you on a calm next step", type: "corporate_tone" },
  { phrase: "keep the focus on supporting your child", type: "abstract_next_step" },
  { phrase: "gentle support", type: "abstract_next_step" },
  { phrase: "subject:", type: "customer_support", modes: ["report_comment"] },
  { phrase: "dear family", type: "customer_support", modes: ["report_comment"] },
  { phrase: "dear parent", type: "customer_support", modes: ["report_comment"] },
  { phrase: "hello,", type: "customer_support", modes: ["report_comment"] },
  { phrase: "kind regards", type: "customer_support", modes: ["report_comment"] },
  { phrase: "best regards", type: "customer_support", modes: ["report_comment"] },
  { phrase: "thank you for bringing this to my attention", type: "customer_support", modes: ["report_comment"] },
  { phrase: "i wanted to update you", type: "customer_support", modes: ["report_comment"] },
  { phrase: "i wanted to give you a clear update", type: "customer_support", modes: ["report_comment"] },
  { phrase: "if a short conversation would help", type: "abstract_next_step", modes: ["report_comment"] },
  { phrase: "continues to make progress", type: "corporate_tone", modes: ["report_comment"] },
  { phrase: "is making steady progress", type: "corporate_tone", modes: ["report_comment"] },
  { phrase: "is a valued member of the class", type: "corporate_tone", modes: ["report_comment"] },
  { phrase: "works well when supported", type: "corporate_tone", modes: ["report_comment"] },
  { phrase: "has the potential to", type: "corporate_tone", modes: ["report_comment"] },
  { phrase: "with continued support", type: "corporate_tone", modes: ["report_comment"] },
]

const GERMAN_RULES: PhraseRule[] = [
  { phrase: "vielen dank, dass sie ihre sorge geteilt haben", type: "generic_empathy" },
  { phrase: "vielen dank für ihre nachricht", type: "customer_support" },
  { phrase: "ich verstehe, wie wichtig das ist", type: "generic_empathy" },
  { phrase: "es könnte hilfreich sein", type: "abstract_next_step" },
  { phrase: "melden sie sich gern", type: "customer_support" },
  { phrase: "ich möchte behutsam antworten", type: "corporate_tone" },
  { phrase: "ich möchte ruhig und sorgfältig darauf eingehen", type: "corporate_tone" },
  { phrase: "mir ist wichtig, dass wir diesen punkt gemeinsam ernst nehmen", type: "corporate_tone" },
  { phrase: "die details zusammentragen", type: "abstract_next_step" },
  { phrase: "den nächsten schritt klar zusammenfassen", type: "abstract_next_step" },
  { phrase: "die situation beobachten", type: "abstract_next_step" },
  { phrase: "ein auge darauf haben", type: "abstract_next_step" },
  { phrase: "gemeinsam für mehr ruhe und klarheit sorgen", type: "abstract_next_step" },
  { phrase: "betreff:", type: "customer_support", modes: ["report_comment"] },
  { phrase: "liebe eltern", type: "customer_support", modes: ["report_comment"] },
  { phrase: "guten tag,", type: "customer_support", modes: ["report_comment"] },
  { phrase: "mit freundlichen grüßen", type: "customer_support", modes: ["report_comment"] },
  { phrase: "danke, dass sie mich darauf aufmerksam gemacht haben", type: "customer_support", modes: ["report_comment"] },
  { phrase: "ich möchte ihnen eine klare rückmeldung", type: "customer_support", modes: ["report_comment"] },
  { phrase: "wenn ein kurzes gespräch hilfreich ist", type: "abstract_next_step", modes: ["report_comment"] },
]

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

function sourceIncludesAny(source: string, snippets: string[]) {
  return snippets.some((snippet) => source.includes(snippet))
}

function resolveRules(language: DraftLanguage, mode: DraftMode) {
  const localeRules = language === "de" ? GERMAN_RULES : ENGLISH_RULES
  return localeRules.filter((rule) => !rule.modes || rule.modes.includes(mode))
}

export function detectTeacherAuthenticityViolations(
  text: string | undefined | null,
  options: TeacherAuthenticityOptions,
): TeacherAuthenticityViolation[] {
  const normalized = normalize(text ?? "")
  if (!normalized) {
    return []
  }

  const seen = new Set<string>()
  const violations: TeacherAuthenticityViolation[] = []
  for (const rule of resolveRules(options.language, options.mode)) {
    if (normalized.includes(rule.phrase) && !seen.has(rule.phrase)) {
      seen.add(rule.phrase)
      violations.push({
        type: rule.type,
        phrase: rule.phrase,
      })
    }
  }

  if (
    options.mode === "report_comment" &&
    (normalized.includes("dear parent") || normalized.includes("liebe eltern"))
  ) {
    violations.push({
      type: "customer_support",
      phrase: options.language === "de" ? "liebe eltern" : "dear parent",
    })
  }

  if (options.direction === "teacher_internal_notes") {
    const source = normalize(options.sourceText ?? "")
    const teacherNotesBans = [
      "thank you for bringing this to my attention",
      "thank you for sharing your concerns",
      "thank you for raising this with me",
    ]
    for (const phrase of teacherNotesBans) {
      if (normalized.includes(phrase) && !seen.has(phrase)) {
        seen.add(phrase)
        violations.push({
          type: "customer_support",
          phrase,
        })
      }
    }

    if (
      normalized.includes("i'm sorry to hear that your child came home so upset") &&
      !sourceIncludesAny(source, ["came home", "upset", "so upset"])
    ) {
      violations.push({
        type: "generic_empathy",
        phrase: "i'm sorry to hear that your child came home so upset",
      })
    }

    if (
      normalized.includes("your child came home") &&
      !sourceIncludesAny(source, ["came home", "home"])
    ) {
      violations.push({
        type: "customer_support",
        phrase: "your child came home",
      })
    }
  }

  return violations
}
