import type { PronounPreference } from "@/lib/types"

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

interface TeacherLanguageOptions {
  firstName?: string
  pronounPreference: PronounPreference
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
  return processed
}
