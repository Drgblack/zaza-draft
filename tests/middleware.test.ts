import { describe, expect, it } from "vitest"
import { buildLoginUrl, shouldRequireAuth } from "@/middleware"

describe("middleware path protection", () => {
  it("guards the insights, account, and settings namespaces", () => {
    expect(shouldRequireAuth("/insights")).toBe(true)
    expect(shouldRequireAuth("/insights/usage")).toBe(true)
    expect(shouldRequireAuth("/account")).toBe(true)
    expect(shouldRequireAuth("/account/data")).toBe(true)
    expect(shouldRequireAuth("/settings")).toBe(true)
    expect(shouldRequireAuth("/settings/privacy")).toBe(true)
    expect(shouldRequireAuth("/support")).toBe(true)
    expect(shouldRequireAuth("/support/guides")).toBe(true)
  })

  it("allows public routes to bypass the guard", () => {
    expect(shouldRequireAuth("/")).toBe(false)
    expect(shouldRequireAuth("/privacy")).toBe(false)
    expect(shouldRequireAuth("/terms")).toBe(false)
  })

  it("builds the login redirect with the next param", () => {
    const loginUrl = buildLoginUrl("https://example.com", "/insights")
    expect(loginUrl.href).toBe("https://example.com/auth/signin?next=/insights")
  })
})
