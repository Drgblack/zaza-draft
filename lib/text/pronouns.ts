import type { PronounPreference } from "@/lib/types"

import { NAME_GENDER } from "@/generated/name-gender"
import { normalizeFirstToken } from "@/lib/draft/normalize"

export type PronounResolutionReason = "manual" | "dataset" | "fallback" | "teacher"

export interface PronounResolution {
  selection: PronounPreference
  resolvedPreference: PronounPreference
  reason: PronounResolutionReason
  source?: string
}

export type PronounSet = { subject: string; object: string; possessive: string; contraction: string }

const MALE_PRONOUNS = /\b(he|him|his|himself)\b/i
const FEMALE_PRONOUNS = /\b(she|her|hers|herself)\b/i
const THEY_PRONOUNS = /\b(they|them|their|theirs|themself|themselves)\b/i

function normalizeName(candidate?: string) {
  return normalizeFirstToken(candidate)
}

export function extractPronounPreferenceFromNotes(notes?: string): PronounPreference | null {
  if (!notes) {
    return null
  }
  const normalized = notes.trim()
  if (!normalized) {
    return null
  }

  const hasMalePronoun = MALE_PRONOUNS.test(normalized)
  const hasFemalePronoun = FEMALE_PRONOUNS.test(normalized)

  if (hasMalePronoun && !hasFemalePronoun) {
    return "he"
  }
  if (hasFemalePronoun && !hasMalePronoun) {
    return "she"
  }
  if (hasMalePronoun && hasFemalePronoun) {
    return "they"
  }
  if (THEY_PRONOUNS.test(normalized)) {
    return "they"
  }

  return null
}

export function inferPronounResolution(
  selection: PronounPreference,
  studentName?: string,
  teacherNotes?: string,
): PronounResolution {
  if (selection !== "auto") {
    return {
      selection,
      resolvedPreference: selection,
      reason: "manual",
    }
  }

  const teacherHint = extractPronounPreferenceFromNotes(teacherNotes)
  if (teacherHint) {
    return {
      selection,
      resolvedPreference: teacherHint,
      reason: "teacher",
      source: "teacher-notes",
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
    resolvedPreference: "they",
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

const PRONOUN_SET: Record<Exclude<PronounPreference, "auto">, PronounSet> = {
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

export function getPronounSet(preference: PronounPreference): PronounSet {
  if (preference === "auto" || preference === "avoid") {
    return PRONOUN_SET.they
  }
  return PRONOUN_SET[preference]
}
