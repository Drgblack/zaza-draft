"use client"

import { describe, expect, it } from "vitest"
import { sanitizeCleanedMessage } from "../sanitize-cleaned-message"

describe("sanitizeCleanedMessage", () => {
  it("removes UI chrome before the actual parent message", () => {
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

  it("collapses blank runs of whitespace-only lines", () => {
    const raw = ["Hello", "", "", "World", "", "  "].join("\n")
    expect(sanitizeCleanedMessage(raw)).toBe("Hello\n\nWorld")
  })

  it("strips Gmail metadata like counts, timestamps, and checkbox glyphs", () => {
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

  it("keeps legitimate 'X of Y' statements inside longer sentences", () => {
    const raw = "He scored 5 of 10 questions correctly on the quiz."
    expect(sanitizeCleanedMessage(raw)).toBe(raw)
  })

  it("drops Gmail sender footers and numeric UI fragments", () => {
    const raw = [
      "Dear Mrs Patel,",
      "",
      "The message you need to respond to is below.",
      "",
      "Mrs Patel",
      "Dr Greg Blackburn (gmail.com)",
      "5 2",
    ].join("\n")

    expect(sanitizeCleanedMessage(raw)).toBe(
      ["Dear Mrs Patel,", "", "The message you need to respond to is below.", "", "Mrs Patel"].join("\n"),
    )
  })
})
