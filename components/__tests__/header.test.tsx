import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { Header } from "@/components/header"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { displayName: "Test User" },
    getIdToken: vi.fn().mockResolvedValue("token"),
    signOut: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => ({
    prefs: {
      firstName: "Test",
      profilePhoto: null,
      preferredTone: "Friendly",
      preferredLanguage: "en",
      lastDocType: "email",
      streakCount: 0,
      lastActiveAt: new Date().toISOString(),
    },
  }),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    setLocale: vi.fn(),
    t: (key: string) => {
      if (key === "header.insightsButtonLabel") return "My insights"
      if (key === "header.insightsButtonAria") return "View my insights"
      return key
    },
    formatDate: () => "",
    formatNumber: () => "",
  }),
}))

describe("Header localization", () => {
  it("shows the localized insights button label in English", () => {
    render(<Header title="Test" saveStatus="saved" onTitleChange={() => {}} />)

    expect(screen.getByText("My insights")).toBeTruthy()
    expect(screen.queryByText("header.insightsButtonLabel")).toBeNull()
  })
})
