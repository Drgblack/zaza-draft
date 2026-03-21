import { describe, expect, it } from "vitest"

import { looksLikeHumanDisplayName } from "../human-display-name"

describe("looksLikeHumanDisplayName", () => {
  it("accepts ordinary human display names", () => {
    expect(looksLikeHumanDisplayName("Greg Blackburn", "greg.blackburn@example.com")).toBe(true)
    expect(looksLikeHumanDisplayName("Mira", "mira@example.com")).toBe(true)
  })

  it("rejects email-like and system-like names", () => {
    expect(looksLikeHumanDisplayName("greg.blackburn@communardo.com")).toBe(false)
    expect(looksLikeHumanDisplayName("Draft Team")).toBe(false)
    expect(looksLikeHumanDisplayName("Admin Support")).toBe(false)
  })

  it("rejects names that match the email domain or local part", () => {
    expect(looksLikeHumanDisplayName("Communardo", "greg.blackburn@communardo.com")).toBe(false)
    expect(looksLikeHumanDisplayName("gregblackburn", "greg.blackburn@communardo.com")).toBe(false)
  })

  it("rejects names with digits or unusual symbols", () => {
    expect(looksLikeHumanDisplayName("Teacher 01", "teacher01@example.com")).toBe(false)
    expect(looksLikeHumanDisplayName("Teacher <>", "teacher@example.com")).toBe(false)
  })
})
