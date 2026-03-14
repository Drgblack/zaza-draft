import type { PronounPreference } from "@/lib/types"
import {
  enforcePronouns,
  getPronounSet,
  repairPronounCaseGrammar,
  type PronounSet,
} from "@/lib/text/pronouns"

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

function toPossessiveName(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`
}

interface TeacherLanguageOptions {
  firstName?: string
  pronounPreference: PronounPreference
  resolvedPronounPreference?: PronounPreference
}

export function enforceTeacherNameStyle(text: string, options: TeacherLanguageOptions) {
  const trimmed = repairPronounCaseGrammar(text.trim())
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

  const pronounPreference = options.resolvedPronounPreference ?? options.pronounPreference
  const pronounSet = getPronounSet(pronounPreference)
  const subjectReference = firstName || pronounSet.subject
  const objectReference = pronounSet.object
  const isPronounReference = subjectReference.toLowerCase() === pronounSet.subject.toLowerCase()

  function adjustTheyVerb(verb: "is" | "has" | "was") {
    switch (verb) {
      case "is":
        return "are"
      case "has":
        return "have"
      case "was":
        return "were"
      default:
        return verb
    }
  }

  function buildSubjectVerbPhrase(verb: "is" | "has" | "was") {
    const adjustedVerb =
      pronounPreference === "they" && isPronounReference ? adjustTheyVerb(verb) : verb
    return `${subjectReference} ${adjustedVerb}`
  }

  function replaceTheStudentReferences(source: string) {
    if (!subjectReference) {
      return source
    }

    let updated = source
    const replacements: Array<{ pattern: RegExp; verb: "is" | "has" | "was" }> = [
      { pattern: /\bthe student is\b/gi, verb: "is" },
      { pattern: /\bthe student has\b/gi, verb: "has" },
      { pattern: /\bthe student was\b/gi, verb: "was" },
    ]
    replacements.forEach(({ pattern, verb }) => {
      const replacement = buildSubjectVerbPhrase(verb)
      updated = updated.replace(pattern, (match) => matchCase(replacement, match))
    })

    updated = updated.replace(/\bthe student's\b/gi, (match) => matchCase(pronounSet.possessive, match))
    return updated
  }

  if (["he", "she", "they"].includes(pronounPreference)) {
    processed = replaceTheStudentReferences(processed)
  }

  if (pronounPreference === "avoid") {
    const possessiveReference = firstName ? toPossessiveName(firstName) : "the student's"
    const objectOrSubjectReference = firstName || "the student"

    processed = processed
      .replace(/\bthe student's\b/gi, (match) => matchCase(possessiveReference, match))
      .replace(/\bthey\b/gi, (match) => matchCase(objectOrSubjectReference, match))
      .replace(/\bthem\b/gi, (match) => matchCase(objectOrSubjectReference, match))
      .replace(/\btheir\b/gi, (match) => matchCase(possessiveReference, match))
      .replace(/\btheirs\b/gi, (match) => matchCase(possessiveReference, match))

    if (firstName) {
      processed = processed
        .replace(new RegExp(`\\b${escapeRegExp(firstName)}\\s+are\\b`, "gi"), (match) =>
          matchCase(`${firstName} is`, match),
        )
        .replace(new RegExp(`\\b${escapeRegExp(firstName)}\\s+have\\b`, "gi"), (match) =>
          matchCase(`${firstName} has`, match),
        )
        .replace(new RegExp(`\\b${escapeRegExp(firstName)}\\s+were\\b`, "gi"), (match) =>
          matchCase(`${firstName} was`, match),
        )
    }
  }

  processed = processed.replace(/\bthe student\b/gi, (match) => matchCase(defaultName, match))

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
    {
      pattern: /\bdisruptions? (?:during|in) (?:lessons|classes?|class)\b/gi,
      template: () => "a few occasions where lessons were interrupted and staying engaged was challenging",
    },
    {
      pattern: /\bdisruptions?\b/gi,
      template: () => "moments where it was difficult to stay focused",
    },
  ]

  disruptionReplacements.forEach(({ pattern, template }) => {
    processed = processed.replace(pattern, (match) => {
      return matchSentenceCase(template(), match)
    })
  })

  if (["he", "she", "they"].includes(pronounPreference)) {
    processed = enforcePronouns(processed, pronounPreference)
  }

  processed = normalizeSingularThey(processed)
  processed = normalizeSingularReferenceAgreement(processed, firstName)
  processed = repairPronounCaseGrammar(processed)
  processed = processed.replace(/\bDear Parent\(s\),/gi, "Dear Parent/Carer,")

  return processed
}

function normalizeSingularThey(value: string) {
  return value
    .replace(/\bthey\s+seems\b/gi, "they seem")
    .replace(/\bthey\s+has\b/gi, "they have")
    .replace(/\bthey\s+was\b/gi, "they were")
    .replace(/\bthey['’]s\b/gi, "their")
}

function normalizeSingularReferenceAgreement(value: string, firstName?: string) {
  const singularReferences = ["your child", "the student"]
  if (firstName?.trim()) {
    singularReferences.unshift(firstName.trim())
  }

  let normalized = value
  for (const reference of singularReferences) {
    const escaped = escapeRegExp(reference)
    normalized = normalized
      .replace(new RegExp(`\\b${escaped}\\s+are\\b`, "gi"), (match) =>
        matchCase(`${reference} is`, match),
      )
      .replace(new RegExp(`\\b${escaped}\\s+have\\b`, "gi"), (match) =>
        matchCase(`${reference} has`, match),
      )
      .replace(new RegExp(`\\b${escaped}\\s+were\\b`, "gi"), (match) =>
        matchCase(`${reference} was`, match),
      )
  }

  return normalized
}
