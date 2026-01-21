"use client"

import { describe, expect, it } from "vitest"
import { sanitizeCleanedMessage } from "../sanitize-cleaned-message"

describe("sanitizeCleanedMessage", () => {
  it("removes known UI/label artefacts while keeping message text", () => {
    const raw = [
      "Active V",
      "Active ✓",
      "Zaza",
      "Support @ ZazaT",
      "ZazaPromptly - Catch-All",
      "",
      "Hi Ms. Riley,",
      "Thanks for your note.",
    ].join("\n")

    expect(sanitizeCleanedMessage(raw)).toBe("Hi Ms. Riley,\nThanks for your note.")
  })

  it("collapses extra blank lines and trims whitespace", () => {
    const raw = ["Hello", "", "", "World", "", "  "].join("\n")
    expect(sanitizeCleanedMessage(raw)).toBe("Hello\n\nWorld")
  })

  it("removes Gmail header metadata lines while keeping the parent message", () => {
    const raw = [
      "5 of 1,142",
      "21:59 (2 minutes ago)",
      "8 ☑️",
      "",
      "Dear Ms. Riley,",
      "Thank you for sharing the update.",
    ].join("\n")

    expect(sanitizeCleanedMessage(raw)).toBe("Dear Ms. Riley,\nThank you for sharing the update.")
  })

  it("does not strip legitimate 'X of Y' content inside a real sentence", () => {
    const raw = "He scored 5 of 10 questions correctly on the quiz."
    expect(sanitizeCleanedMessage(raw)).toBe(raw)
  })
})
