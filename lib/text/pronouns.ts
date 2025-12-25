import { NAME_GENDER } from "../../src/generated/name-gender"
import type { PronounPreference } from "@/lib/types"

export type PronounResolutionReason = "manual" | "dataset" | "fallback"

export interface PronounResolution {
  selection: PronounPreference
  resolvedPreference: PronounPreference
  reason: PronounResolutionReason
  source?: string
}

function normalizeName(candidate?: string) {
  if (!candidate) {
    return null
  }
  const match = candidate.trim().split(/\s+/)[0]
  if (!match) {
    return null
  }
  const lettersOnly = match.replace(/[^A-Za-z]/g, "")
  return lettersOnly.toLowerCase() || null
}

export function inferPronounResolution(
  selection: PronounPreference,
  studentName?: string,
): PronounResolution {
  if (selection !== "auto") {
    return {
      selection,
      resolvedPreference: selection,
      reason: "manual",
    }
  }

  const normalized = normalizeName(studentName)
  if (normalized) {
    const genderMark = NAME_GENDER[normalized]
    if (genderMark === "m") {
      return {
        selection,
        resolvedPreference: "he",
        reason: "dataset",
        source: normalized,
      }
    }
    if (genderMark === "f") {
      return {
        selection,
        resolvedPreference: "she",
        reason: "dataset",
        source: normalized,
      }
    }
  }

  return {
    selection,
    resolvedPreference: "avoid",
    reason: "fallback",
  }
}

function capitalize(word: string) {
  if (!word) {
    return word
  }
  return word[0].toUpperCase() + word.slice(1)
}

function matchCase(replacement: string, original: string) {
  if (original[0] === original[0].toUpperCase()) {
    return capitalize(replacement)
  }
  return replacement
}

const PRONOUN_SET: Record<Exclude<PronounPreference, "auto">, { subject: string; object: string; possessive: string; contraction: string }> = {
  he: {
    subject: "he",
    object: "him",
    possessive: "his",
    contraction: "he's",
  },
  she: {
    subject: "she",
    object: "her",
    possessive: "her",
    contraction: "she's",
  },
  they: {
    subject: "they",
    object: "them",
    possessive: "their",
    contraction: "they're",
  },
  avoid: {
    subject: "the student",
    object: "the student",
    possessive: "the student's",
    contraction: "the student is",
  },
}

const SUBJECT_REGEX = /\b(he|she|they)\b/gi
const OBJECT_REGEX = /\b(him|her|them)\b/gi
const POSSESSIVE_REGEX = /\b(his|her|hers|their|theirs)\b/gi
const CONTRACTION_REGEX = /\b(he's|she's|they's|they're)\b/gi

export function enforcePronouns(text: string, preference: PronounPreference) {
  if (preference === "auto") {
    return text
  }

  const pronounSet = PRONOUN_SET[preference]

  let enforced = text
    .replace(SUBJECT_REGEX, (match) => matchCase(pronounSet.subject, match))
    .replace(OBJECT_REGEX, (match) => matchCase(pronounSet.object, match))
    .replace(POSSESSIVE_REGEX, (match) => {
      const lower = match.toLowerCase()
      if (lower === "hers") {
        return matchCase(pronounSet.possessive + "s", match)
      }
      return matchCase(pronounSet.possessive, match)
    })
    .replace(CONTRACTION_REGEX, (match) => matchCase(pronounSet.contraction, match))

  if (preference === "they") {
    enforced = enforced.replace(/\bthey is\b/gi, (match) => matchCase("they are", match))
  }

  return enforced
}
