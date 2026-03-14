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
  { phrase: "work with you on a calm next step", type: "corporate_tone" },
  { phrase: "keep the focus on supporting your child", type: "abstract_next_step" },
  { phrase: "gentle support", type: "abstract_next_step" },
]

const GERMAN_RULES: PhraseRule[] = [
  { phrase: "vielen dank, dass sie ihre sorge geteilt haben", type: "generic_empathy" },
  { phrase: "vielen dank für ihre nachricht", type: "customer_support" },
  { phrase: "ich verstehe, wie wichtig das ist", type: "generic_empathy" },
  { phrase: "es könnte hilfreich sein", type: "abstract_next_step" },
  { phrase: "melden sie sich gern", type: "customer_support" },
  { phrase: "ich möchte behutsam antworten", type: "corporate_tone" },
  { phrase: "ich möchte ruhig und sorgfältig darauf eingehen", type: "corporate_tone" },
  { phrase: "gemeinsam für mehr ruhe und klarheit sorgen", type: "abstract_next_step" },
]

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
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

  return violations
}
