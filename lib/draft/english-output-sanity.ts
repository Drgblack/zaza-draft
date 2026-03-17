import { repairPronounCaseGrammar } from "@/lib/text/pronouns"
import type { DraftMode, DraftTone } from "@/lib/types"

export type EnglishOutputSanityIssue =
  | "pronoun_case"
  | "reference_agreement"
  | "greeting_punctuation"
  | "signoff_punctuation"
  | "subject_punctuation"
  | "parent_voice"
  | "tone_distinction"

interface EnglishOutputSanityOptions {
  language?: string
  mode: DraftMode
  tone?: DraftTone
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
      /\bspecific strategies to help (him|her|them) stay more engaged during (?:our )?activities\b/gi,
      (pronoun) =>
        `some approaches that may help ${pronoun === "them" ? "them" : pronoun === "him" ? "him" : "her"} stay focused during lessons`,
    ],
    [
      /\b(?:may\s+)?benefit from additional encouragement\b/gi,
      () => "may need clearer routines and regular encouragement",
    ],
    [
      /\bsupport (his|her|their) progress together\b/gi,
      (pronoun) =>
        `work together to help ${pronoun === "their" ? "them" : pronoun === "his" ? "him" : "her"} make steady progress`,
    ],
    [/\bpractical ways we can work together\b/gi, () => "next steps we can take together"],
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
    [/\bengaged during instruction time\b/gi, () => "focused during lessons"],
    [/\bengaged during class\b/gi, () => "focused during lessons"],
  ]

  for (const [pattern, replacement] of phraseReplacements) {
    normalized = normalized.replace(pattern, (match, ...groups: string[]) => {
      changed = true
      return matchCase(replacement(...groups), match)
    })
  }

  return { text: normalized, changed }
}

function insertSentenceBeforeSignoff(text: string, sentence: string) {
  const lines = text.split("\n")
  const signoffIndex = lines.findIndex((line) => ENGLISH_SIGNOFF_LINE_REGEX.test(line.trim()))

  if (signoffIndex === -1) {
    return {
      text: `${text.trim()}\n\n${sentence}`,
      changed: true,
    }
  }

  const beforeSignoff = lines.slice(0, signoffIndex).join("\n").trimEnd()
  const signoffBlock = lines.slice(signoffIndex).join("\n").trimStart()

  return {
    text: `${beforeSignoff}\n\n${sentence}\n\n${signoffBlock}`,
    changed: true,
  }
}

function applyParentMessageTonePolish(
  text: string,
  tone: DraftTone | undefined,
  studentFirstName?: string,
) {
  if (!tone || (tone !== "warm" && tone !== "direct")) {
    return { text, changed: false }
  }

  let normalized = text
  let changed = false

  if (tone === "warm") {
    const partnershipSignal =
      /\b(?:working together|your support with this|thank you for your support|help (?:him|her|them|your child|[A-Z][a-z]+) feel more settled in class)\b/i

    if (!partnershipSignal.test(normalized)) {
      const studentReference = studentFirstName?.trim() || "your child"
      const partnershipSentence =
        `Thank you for your support with this, and working together will help ${studentReference} feel more settled in class.`
      const insertion = insertSentenceBeforeSignoff(normalized, partnershipSentence)
      normalized = insertion.text
      changed = insertion.changed
    }
  }

  if (tone === "direct") {
    const replacements: Array<[RegExp, string]> = [
      [/\bI wanted to let you know about\b/gi, "I am writing about"],
      [/\bI wanted to let you know that\b/gi, "I am writing to let you know that"],
      [/\bI wanted to make you aware of\b/gi, "I need to make you aware of"],
      [/\bI would appreciate your support in speaking with\b/gi, "Please speak with"],
      [/\bThank you for your support with this, and working together will help [^.]+ feel more settled in class\.\s*/gi, ""],
    ]

    for (const [pattern, replacement] of replacements) {
      const next = normalized.replace(pattern, replacement)
      if (next !== normalized) {
        normalized = next
        changed = true
      }
    }

    normalized = normalized
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
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

    const tonePolished = applyParentMessageTonePolish(
      sanitized,
      options.tone,
      options.studentFirstName,
    )
    if (tonePolished.changed) {
      issues.push("tone_distinction")
      sanitized = tonePolished.text
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
