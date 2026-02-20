import { describe, expect, it } from "vitest"
import { shouldRequireAuth } from "@/proxy"

describe("middleware path protection", () => {
  it("guards the insights, account, and settings namespaces", () => {
    expect(shouldRequireAuth("/insights")).toBe(true)
    expect(shouldRequireAuth("/insights/usage")).toBe(true)
    expect(shouldRequireAuth("/account")).toBe(true)
    expect(shouldRequireAuth("/account/data")).toBe(true)
    expect(shouldRequireAuth("/settings")).toBe(true)
    expect(shouldRequireAuth("/settings/privacy")).toBe(true)
  })

  it("allows public routes to bypass the guard", () => {
    expect(shouldRequireAuth("/")).toBe(false)
    expect(shouldRequireAuth("/privacy")).toBe(false)
    expect(shouldRequireAuth("/terms")).toBe(false)
  })
})
