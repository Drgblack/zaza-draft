"use client"

import { describe, expect, it } from "vitest"
import { formatGreetingDisplay } from "../greeting-display"

describe("formatGreetingDisplay", () => {
  it("returns greeting alone when no name", () => {
    expect(formatGreetingDisplay("Good evening")).toBe("Good evening")
  })

  it("appends name when provided", () => {
    expect(formatGreetingDisplay("Guten Abend", "Lehrer")).toBe("Guten Abend, Lehrer")
  })

  it("does not return 'there' or 'da'", () => {
    const result = formatGreetingDisplay("Good evening", "")
    expect(result).not.toContain("there")
    expect(result).not.toContain("da")
  })
})
