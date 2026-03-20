// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getEmailLinkActionCodeSettings,
  getEmailLinkRedirectUrl,
  resolveEmailLinkRedirectUrl,
} from "@/lib/auth/email-link"

describe("email-link auth helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    window.history.replaceState({}, "", "http://localhost:3000/")
  })

  it("falls back to the current local origin when NEXT_PUBLIC_APP_URL is missing", () => {
    window.history.replaceState({}, "", "http://localhost:3000/login")

    expect(getEmailLinkRedirectUrl()).toBe("http://localhost:3000/")
  })

  it("throws on the canonical production host when NEXT_PUBLIC_APP_URL points elsewhere", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://zaza-draft.vercel.app")

    expect(() => resolveEmailLinkRedirectUrl("https://app.zazadraft.com")).toThrow(
      "NEXT_PUBLIC_APP_URL must be https://app.zazadraft.com when running on app.zazadraft.com.",
    )
  })

  it("builds ActionCodeSettings for the canonical app root", () => {
    window.history.replaceState({}, "", "https://app.zazadraft.com/login")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.zazadraft.com")

    expect(getEmailLinkActionCodeSettings()).toEqual({
      url: "https://app.zazadraft.com/",
      handleCodeInApp: true,
    })
  })
})
