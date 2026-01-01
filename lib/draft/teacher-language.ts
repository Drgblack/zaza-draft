import type { PronounPreference } from "@/lib/types"
import { getPronounSet } from "@/lib/text/pronouns"

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

function matchSentenceCase(replacement: string, original: string) {
  if (!original) {
    return replacement
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

interface TeacherLanguageOptions {
  firstName?: string
  pronounPreference: PronounPreference
  resolvedPronounPreference?: PronounPreference
}

export function enforceTeacherNameStyle(text: string, options: TeacherLanguageOptions) {
  const trimmed = text.trim()
  if (!trimmed) {
    return text
  }

  const firstName = options.firstName?.trim()
  const defaultName = firstName || "your child"
  const sentences = trimmed.match(/[^.!?]+[.!?]*/g) ?? [trimmed]

  if (firstName) {
    const nameRegex = new RegExp(`\\b${escapeRegExp(firstName)}\\b`, "i")
    const firstTwo = sentences.slice(0, 2)
    const containsName = firstTwo.some((sentence) => nameRegex.test(sentence))
    if (!containsName) {
      sentences[0] = `${firstName}, ${sentences[0].trim()}`
    }
  }

  let processed = sentences.join(" ").replace(/\s+/g, " ").trim()
  processed = processed.replace(/\bthe student\b/gi, (match) => matchCase(defaultName, match))

  const pronounPreference = options.resolvedPronounPreference ?? options.pronounPreference
  const pronounSet = getPronounSet(pronounPreference)
  const subjectReference = firstName || pronounSet.subject
  const objectReference = pronounSet.object

  let yourChildMentions = 0
  processed = processed
    .replace(/\byour child's\b/gi, (match) => {
      yourChildMentions += 1
      if (yourChildMentions === 1) {
        return matchCase("your child's", match)
      }
      return matchCase(pronounSet.possessive, match)
    })
    .replace(/\byour child\b/gi, (match) => {
      yourChildMentions += 1
      if (yourChildMentions === 1) {
        return matchCase("your child", match)
      }
      return matchCase(pronounSet.subject, match)
    })

  const disruptionReplacements: Array<{ pattern: RegExp; template: () => string }> = [
    {
      pattern: /\binstances of disruption\b/gi,
      template: () => `moments where ${subjectReference} has found it difficult to stay focused`,
    },
    {
      pattern: /\bdisruption during lessons\b/gi,
      template: () => "difficulty staying engaged during lessons",
    },
  ]

  disruptionReplacements.forEach(({ pattern, template }) => {
    processed = processed.replace(pattern, (match) => {
      return matchSentenceCase(template(), match)
    })
  })

  const reassuranceSentence = firstName
    ? `My aim is to support ${firstName} positively and help ${objectReference} feel confident and successful at school.`
    : "My aim is to support your child positively and help them feel confident and successful at school."

  if (!/(aim to support|work together|confident and successful)/i.test(processed)) {
    processed = insertReassurance(processed, reassuranceSentence)
  }

  return processed
}

function insertReassurance(text: string, sentence: string) {
  const trimmed = text.trimEnd()
  const signoffPattern = /\n(?:(?:Kind|Warm|Best|Many)\s+regards,|Sincerely,|Yours sincerely,|Best wishes,|With thanks,|Thanks,)/i
  const match = trimmed.match(signoffPattern)
  if (match) {
    const index = trimmed.search(signoffPattern)
    return `${trimmed.slice(0, index).trimEnd()}\n\n${sentence}\n${trimmed.slice(index).trimStart()}`
  }
  return `${trimmed}\n\n${sentence}`
}
