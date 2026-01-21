"use client"

import { describe, expect, it } from "vitest"
import { detectOutOfScopeRequest } from "./out-of-scope"

describe("detectOutOfScopeRequest", () => {
  it("flags recipe and cooking requests as low risk", () => {
    const { isOutOfScope, severity } = detectOutOfScopeRequest("Could you share your chocolate cake recipe?")
    expect(isOutOfScope).toBe(true)
    expect(severity).toBe("low")
  })

  it("flags requests for private contact details as high risk", () => {
    const result = detectOutOfScopeRequest("Please text me on your personal mobile number or WhatsApp.")
    expect(result.isOutOfScope).toBe(true)
    expect(result.severity).toBe("high")
  })

  it("flags private home visits as high risk", () => {
    const result = detectOutOfScopeRequest("Can we meet at my house after school?")
    expect(result.isOutOfScope).toBe(true)
    expect(result.severity).toBe("high")
  })

  it("flags gift or payment offers as high risk", () => {
    const result = detectOutOfScopeRequest("We can give you a gift card or cash if you help.")
    expect(result.isOutOfScope).toBe(true)
    expect(result.severity).toBe("high")
  })

  it("allows homework clarification", () => {
    const result = detectOutOfScopeRequest("Could you explain the homework due next week?")
    expect(result.isOutOfScope).toBe(false)
  })

  it("allows meeting requests via school office", () => {
    const result = detectOutOfScopeRequest("Please schedule a meeting with the school office.")
    expect(result.isOutOfScope).toBe(false)
  })
})
