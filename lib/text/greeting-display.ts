"use strict"

const TITLE_SUFFIX_PATTERN = /\b(Mr|Mrs|Ms|Miss|Dr|Prof|Mx|Sir|Madam|Teacher)\.?$/i

export function formatGreetingDisplay(greeting: string, name?: string | null) {
  const trimmedGreeting = greeting.trim()
  const normalizedName = name?.replace(/\s+/g, " ").trim()

  if (!normalizedName) {
    return trimmedGreeting
  }

  if (TITLE_SUFFIX_PATTERN.test(trimmedGreeting)) {
    const greetingWithoutTitlePunctuation = trimmedGreeting.replace(/\.\s*$/, "")
    return `${greetingWithoutTitlePunctuation} ${normalizedName}`
  }

  const greetingBase = trimmedGreeting.replace(/,\s*$/, "")
  return `${greetingBase}, ${normalizedName}`
}
