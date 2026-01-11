"use strict"

export function formatGreetingDisplay(greeting: string, name?: string | null) {
  const trimmedName = name?.trim()
  if (trimmedName) {
    return `${greeting}, ${trimmedName}`
  }
  return greeting
}
