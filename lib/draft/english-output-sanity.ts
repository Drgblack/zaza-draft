import { repairPronounCaseGrammar } from "@/lib/text/pronouns"
import type { DraftMode } from "@/lib/types"

export type EnglishOutputSanityIssue =
  | "pronoun_case"
  | "reference_agreement"
  | "greeting_punctuation"
  | "signoff_punctuation"
  | "subject_punctuation"
  | "parent_voice"

interface EnglishOutputSanityOptions {
  language?: string
  mode: DraftMode
  studentFirstName?: string
}

interface EnglishOutputSanityResult {
  text: string
  issues: EnglishOutputSanityIssue[]
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function matchCase(replacement: string, original: string) {
  if (!original) {
    return replacement
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

const ENGLISH_GREETING_LINE_REGEX =
  /^(Hello|Hi|Dear|Good morning|Good afternoon|Good evening)\b([\s\S]*)$/i

const ENGLISH_SIGNOFF_LINE_REGEX =
  /^(Kind regards|Best regards|Regards|Sincerely|Yours sincerely|Best wishes|With thanks|Thanks)[,;:.!?]*$/i

function normalizeEnglishSubjectLine(text: string) {
  const lines = text.split("\n")
  let changed = false
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      continue
    }
    const labelMatch = trimmed.match(/^Subject\b\s*([^\n]+)$/i)
    if (!labelMatch) {
      break
    }
    if (/^Subject\s*:/i.test(trimmed)) {
      break
    }
    const content = labelMatch[1].replace(/^[:\-–—|.,;!?]+\s*/, "").trim()
    lines[i] = content ? `Subject: ${content}` : "Subject:"
    changed = true
    break
  }
  return { text: lines.join("\n"), changed }
}

function normalizeEnglishGreetingLine(text: string) {
  const lines = text.split("\n")
  let changed = false
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      continue
    }
    if (/^Subject\s*:/i.test(trimmed)) {
      continue
    }
    const match = trimmed.match(ENGLISH_GREETING_LINE_REGEX)
    if (!match) {
      break
    }
    const prefix = match[1]
    const remainder = match[2].replace(/[,:;.!?]+$/g, "").trim()
    const normalized = remainder ? `${prefix} ${remainder},` : `${prefix},`
    if (normalized !== trimmed) {
      lines[i] = normalized
      changed = true
    }
    break
  }
  return { text: lines.join("\n"), changed }
}

function normalizeEnglishSignoffLines(text: string) {
  const lines = text.split("\n")
  let changed = false
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      continue
    }
    if (!ENGLISH_SIGNOFF_LINE_REGEX.test(trimmed)) {
      continue
    }
    if (trimmed !== "Kind regards,") {
      lines[i] = "Kind regards,"
      changed = true
    }
  }
  return { text: lines.join("\n"), changed }
}

function normalizeSingularReferenceAgreement(text: string, studentFirstName?: string) {
  const singularReferences = ["your child", "the student"]
  if (studentFirstName?.trim()) {
    singularReferences.unshift(studentFirstName.trim())
  }

  let normalized = text
  let changed = false

  for (const reference of singularReferences) {
    const escaped = escapeRegExp(reference)
    const replacements: Array<[RegExp, string]> = [
      [new RegExp(`\\b${escaped}\\s+are\\b`, "gi"), `${reference} is`],
      [new RegExp(`\\b${escaped}\\s+have\\b`, "gi"), `${reference} has`],
      [new RegExp(`\\b${escaped}\\s+were\\b`, "gi"), `${reference} was`],
    ]

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, (match) => {
        changed = true
        return matchCase(replacement, match)
      })
    }
  }

  return { text: normalized, changed }
}

function buildPossessiveReference(reference: string) {
  return `${reference}'s`
}

function normalizeParentMessageTeacherVoice(text: string, studentFirstName?: string) {
  const baseReference = studentFirstName?.trim() || "your child"
  const possessiveReference = buildPossessiveReference(baseReference)
  const replacements: Array<[RegExp, string]> = [
    [/\bthe student's\b/gi, possessiveReference],
    [/\bthe learner's\b/gi, possessiveReference],
    [/\bthis learner's\b/gi, possessiveReference],
    [/\bthe student\b/gi, baseReference],
    [/\bthe learner\b/gi, baseReference],
    [/\bthis learner\b/gi, baseReference],
    [/\bduring instruction time\b/gi, "during class"],
    [/\binstruction time\b/gi, "class time"],
    [/\blearning tasks\b/gi, "classwork"],
  ]

  let normalized = text
  let changed = false

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, (match) => {
      changed = true
      return matchCase(replacement, match)
    })
  }

  const phraseReplacements: Array<[RegExp, (...groups: string[]) => string]> = [
    [/\bidentify(?: any)? specific supports that would be useful\b/gi, () => "see what might help"],
    [/\badditional support strategies\b/gi, () => "practical next steps"],
    [/\bopportunities for support\b/gi, () => "ways we can help"],
    [
      /\bexplore whether additional support strategies might be helpful\b/gi,
      () => "see what practical next steps may help",
    ],
    [
      /\bdevelop strategies that will support (his|her|their) success in the classroom\b/gi,
      (pronoun) => `work together on ways to help ${pronoun === "their" ? "them" : pronoun === "his" ? "him" : "her"} in class`,
    ],
    [
      /\bsupport (his|her|their) overall learning experience\b/gi,
      (pronoun) => `help ${pronoun === "their" ? "them" : pronoun === "his" ? "him" : "her"} feel more successful at school`,
    ],
  ]

  for (const [pattern, replacement] of phraseReplacements) {
    normalized = normalized.replace(pattern, (match, ...groups: string[]) => {
      changed = true
      return matchCase(replacement(...groups), match)
    })
  }

  return { text: normalized, changed }
}

export function applyEnglishOutputSanity(
  text: string,
  options: EnglishOutputSanityOptions,
): EnglishOutputSanityResult {
  const normalizedLanguage = options.language?.toLowerCase() ?? ""
  if (!normalizedLanguage.startsWith("en")) {
    return { text, issues: [] }
  }
  if (options.mode !== "parent_message" && options.mode !== "report_comment") {
    return { text, issues: [] }
  }

  let sanitized = text.replace(/\r\n/g, "\n")
  const issues: EnglishOutputSanityIssue[] = []

  const pronounRepaired = repairPronounCaseGrammar(sanitized)
  if (pronounRepaired !== sanitized) {
    issues.push("pronoun_case")
    sanitized = pronounRepaired
  }

  if (options.mode === "parent_message") {
    const parentVoiceNormalized = normalizeParentMessageTeacherVoice(
      sanitized,
      options.studentFirstName,
    )
    if (parentVoiceNormalized.changed) {
      issues.push("parent_voice")
      sanitized = parentVoiceNormalized.text
    }
  }

  const agreementNormalized = normalizeSingularReferenceAgreement(
    sanitized,
    options.studentFirstName,
  )
  if (agreementNormalized.changed) {
    issues.push("reference_agreement")
    sanitized = agreementNormalized.text
  }

  if (options.mode === "parent_message") {
    const subjectNormalized = normalizeEnglishSubjectLine(sanitized)
    if (subjectNormalized.changed) {
      issues.push("subject_punctuation")
      sanitized = subjectNormalized.text
    }

    const greetingNormalized = normalizeEnglishGreetingLine(sanitized)
    if (greetingNormalized.changed) {
      issues.push("greeting_punctuation")
      sanitized = greetingNormalized.text
    }

    const signoffNormalized = normalizeEnglishSignoffLines(sanitized)
    if (signoffNormalized.changed) {
      issues.push("signoff_punctuation")
      sanitized = signoffNormalized.text
    }
  }

  return {
    text: sanitized,
    issues,
  }
}
