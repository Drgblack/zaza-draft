import { describe, expect, it } from "vitest"

import { detectSensitiveContent } from "@/lib/safety"

describe("detectSensitiveContent", () => {
  it("does not treat ISO dates as phone numbers", () => {
    const result = detectSensitiveContent("Date: 2026-03-15 | Context: behaviour")

    expect(result.matches).toHaveLength(0)
    expect(result.sanitized).toContain("2026-03-15")
    expect(result.sanitized).not.toContain("[REDACTED PHONE]")
  })

  it("still redacts actual phone numbers", () => {
    const result = detectSensitiveContent("Please call me on 07123 456789.")

    expect(result.matches).toEqual([{ type: "phone", match: "07123 456789" }])
    expect(result.sanitized).toContain("[REDACTED PHONE]")
  })
})
