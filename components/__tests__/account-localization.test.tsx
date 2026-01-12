// @vitest-environment happy-dom

import "@testing-library/jest-dom"

import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const tMock = vi.fn()
vi.mock("@/hooks/use-locale", () => {
  const translations: Record<string, string> = {
    "account.profile.title": "Profil",
    "account.profile.copyUid": "UID kopieren",
    "account.profile.uidCopied": "Kopiert!",
    "account.profile.uidLabel": "UID",
    "diagnostics.lastRunNever": "Noch nicht",
  }
  return {
    useLocale: () => ({
      locale: "de-DE",
      setLocale: vi.fn(),
      formatDate: () => "01.01.2026, 12:00",
      formatNumber: () => "0",
      t: (key: string) => {
        tMock(key)
        return translations[key] ?? key
      },
    }),
  }
})

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => ({
    prefs: { firstName: "Sarah", profilePhoto: null },
    updatePrefs: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { uid: "uid", displayName: "Sarah", email: "sarah@example.com" },
    signOut: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue("token"),
  }),
}))

vi.mock("@/lib/analytics", () => ({
  logClientEvent: vi.fn(),
}))

vi.mock("@/lib/dev/feature-flags", () => ({
  canShowDevUid: true,
}))

const mockFetch = vi.fn((input) => {
  const url = typeof input === "string" ? input : input.url
  if (url.includes("/api/diagnostics")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          models: { primary: null, fallback: null },
          plan: "free",
          usage: { plan: "free", currentMonthUsage: 0, limit: 1, remaining: 1 },
          diagnostics: { lastRunAt: { seconds: 1_700_000_000 } },
        },
      }),
    })
  }
  if (url.includes("/api/account/status")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          plan: "free",
          usage: { plan: "free", currentMonthUsage: 0, limit: 1, remaining: 1 },
          isQaUser: false,
        },
      }),
    })
  }
  return Promise.resolve({ ok: true, json: async () => ({ success: true, data: {} }) })
})

describe("Account page localization", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    mockFetch.mockClear()
  })

  it("shows German copy/feedback text for the UID button", async () => {
    const { default: AccountPage } = await import("../../app/account/page.tsx")
    render(<AccountPage />)

    const copyLabel = "UID kopieren"
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: copyLabel }),
      ).toBeInTheDocument(),
    )

    const uidButton = screen.getByRole("button", { name: copyLabel })
    expect(tMock).toHaveBeenCalledWith("account.profile.copyUid")
    expect(uidButton).toBeInTheDocument()

    fireEvent.click(uidButton)
    await waitFor(() => expect(tMock).toHaveBeenCalledWith("account.profile.uidCopied"))
  })
})
