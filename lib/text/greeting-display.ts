"use strict"

const TITLE_SUFFIX_PATTERN = /\b(Mr|Mrs|Ms|Miss|Dr|Prof|Mx|Sir|Madam|Teacher)\.?$/i

const normalizeWhitespace = (value: string) =>
  value
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

export function formatGreetingDisplay(greeting: string, name?: string | null) {
  const normalizedGreeting = normalizeWhitespace(greeting)
  const normalizedName = name ? normalizeWhitespace(name) : ""

  if (!normalizedName) {
    return normalizedGreeting
  }

  if (TITLE_SUFFIX_PATTERN.test(normalizedGreeting)) {
    const greetingWithoutTitlePunctuation = normalizedGreeting.replace(/\.\s*$/, "")
    return `${greetingWithoutTitlePunctuation} ${normalizedName}`
  }

  const greetingBase = normalizedGreeting.replace(/,\s*$/, "")
  return `${greetingBase}, ${normalizedName}`
}
