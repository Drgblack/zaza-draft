// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock auth as signed-in
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      uid: "test-uid",
      email: "greg@zazatechnologies.com",
      displayName: "Greg",
      getIdToken: async () => "test-token",
    },
    status: "authenticated",
    signOut: async () => Promise.resolve(),
    getIdToken: async () => "test-token",
  }),
}))

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => ({
    prefs: {
      firstName: "Greg",
      profilePhoto: null,
      preferredTone: "Professional",
      preferredLanguage: "de",
      lastDocType: "lesson-plan",
      streakCount: 0,
      lastActiveAt: "2026-01-01T00:00:00.000Z",
      signatureLine1: "",
      signatureLine2: undefined,
      signatureLine3: undefined,
      autoAppendSignatureParentMessage: false,
      autoAppendSignatureReportComment: false,
    },
    updatePrefs: () => undefined,
    setPreferredTone: () => false,
    setPreferredLanguage: () => undefined,
    setLastDocType: () => undefined,
    incrementStreak: () => undefined,
  }),
}))

// Ensure the dev UID button is allowed to render
vi.mock("@/lib/dev/feature-flags", () => ({
  canShowDevUid: true,
}))

// Force DE locale + translations used in this test
vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "de",
    t: (key: string) => {
      const dict: Record<string, string> = {
        "account.devUid.copy": "UID kopieren",
        "account.devUid.copied": "UID kopiert",
        "account.profile.copyUid": "UID kopieren",
        "account.profile.uidCopied": "UID kopiert",
      }
      return dict[key] ?? key
    },
    formatDate: () => "2026-01-01",
  }),
}))

import AccountPage from "@/app/account/page"

describe("Account page localization", () => {
  it("shows German copy/feedback text for the UID button", async () => {
    render(<AccountPage />)

    // Button should exist in DE
    expect(
      await screen.findByRole("button", { name: "UID kopieren" })
    ).toBeTruthy()
  })
})

