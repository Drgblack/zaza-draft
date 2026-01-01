const PRONOUN_TOKENS = new Set([
  "he",
  "she",
  "they",
  "him",
  "her",
  "them",
  "his",
  "hers",
  "their",
  "theirs",
  "himself",
  "herself",
  "themself",
  "themselves",
  "ze",
  "zir",
  "xe",
  "xem",
  "xyr",
])

function looksLikePronounHint(parenthetical: string): boolean {
  if (!parenthetical) {
    return false
  }
  const normalized = parenthetical.toLowerCase().trim()
  if (!normalized) {
    return false
  }
  if (normalized.includes("/")) {
    const tokens = normalized.split(/[\/\s]+/).map((token) => token.trim()).filter(Boolean)
    return tokens.some((token) => PRONOUN_TOKENS.has(token))
  }
  const tokens = normalized.split(/\s+/).map((token) => token.trim()).filter(Boolean)
  return tokens.some((token) => PRONOUN_TOKENS.has(token))
}

export function cleanStudentName(raw: string): string {
  if (!raw) {
    return ""
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return ""
  }

  const parentheticalMatch = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!parentheticalMatch) {
    return trimmed
  }

  const [, namePart, parenthetical] = parentheticalMatch
  if (!namePart) {
    return trimmed
  }

  if (looksLikePronounHint(parenthetical)) {
    return namePart.trim()
  }

  return trimmed
}
