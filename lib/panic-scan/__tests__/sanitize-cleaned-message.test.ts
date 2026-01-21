"use client"

import { describe, expect, it } from "vitest"
import { sanitizeCleanedMessage } from "../sanitize-cleaned-message"

describe("sanitizeCleanedMessage", () => {
  it("removes known UI/label artefacts while keeping message text", () => {
    const raw = [
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
})
