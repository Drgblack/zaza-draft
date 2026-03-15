// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

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
      preferredLanguage: "en",
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

vi.mock("@/lib/dev/feature-flags", () => ({
  canShowDevUid: true,
}))

vi.mock("@/hooks/use-locale", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/use-locale")>("@/hooks/use-locale")
  return {
    ...actual,
    useLocale: () => ({
      locale: "en-GB",
      t: (key: string) => actual.localeMessages["en-GB"][key] ?? key,
      formatDate: () => "2026-01-01",
    }),
  }
})

import AccountPage from "@/app/account/page"

describe("Account page English localization", () => {
  it("shows English account settings strings when locale is EN", async () => {
    render(<AccountPage />)

    expect(await screen.findByText("Profile Photo")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Upload Photo" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy()
    expect(screen.getByText("Session")).toBeTruthy()

    expect(screen.queryByText("Profilfoto")).toBeNull()
    expect(screen.queryByText("Foto hochladen")).toBeNull()
    expect(screen.queryByText("Änderungen speichern")).toBeNull()
    expect(screen.queryByText("Sitzung")).toBeNull()
  })
})
