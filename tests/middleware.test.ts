import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { middleware, buildLoginUrl, shouldRequireAuth } from "@/middleware"
import { AUTH_COOKIE_VALUE } from "@/lib/auth/cookie"

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

  it("redirects unauthenticated insights requests to /auth/signin with next", () => {
    const request = {
      nextUrl: new URL("https://example.com/insights"),
      cookies: {
        get: () => undefined,
      },
      url: "https://example.com/insights",
    } as unknown as NextRequest

    const response = middleware(request)
    expect(response.headers.get("location")).toBe("https://example.com/auth/signin?next=/insights")
  })

  it("allows authenticated requests through", () => {
    const request = {
      nextUrl: new URL("https://example.com/insights"),
      cookies: {
        get: () => ({ value: AUTH_COOKIE_VALUE }),
      },
      url: "https://example.com/insights",
    } as unknown as NextRequest

    const response = middleware(request)
    expect(response.headers.get("location")).toBeNull()
  })
})
