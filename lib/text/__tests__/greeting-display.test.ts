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

  it("joins title greetings without a comma", () => {
    expect(formatGreetingDisplay("Dear Mr.", "Khalid")).toBe("Dear Mr Khalid")
  })

  it("keeps honorific and surname on one line even when greeting contains newline", () => {
    expect(formatGreetingDisplay("Dear Mrs.\n", "Turner")).toBe("Dear Mrs Turner")
    expect(formatGreetingDisplay("Dear Mr.\r\n", "Khalid")).toBe("Dear Mr Khalid")
  })

  it("does not return 'there' or 'da'", () => {
    const result = formatGreetingDisplay("Good evening", "")
    expect(result).not.toContain("there")
    expect(result).not.toContain("da")
  })
})
