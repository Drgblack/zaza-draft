// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

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
    status: "authenticated",
    signOut: vi.fn(),
    signInWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
    getIdToken: vi.fn(),
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
      const translations: Record<string, string> = {
        "header.insightsButtonLabel": "My insights",
        "header.insightsButtonAria": "View my insights",
        share: "Share",
        "account.menu.userMenu": "Account menu",
        "footer.links.draft": "Draft",
      }
      return translations[key] ?? key
    },
    formatDate: () => "",
    formatNumber: () => "",
  }),
}))

import { AppShell } from "@/components/layout/app-shell"

describe("AppShell layout", () => {
  it("wraps content with header and footer", () => {
    render(
      <AppShell>
        <div data-testid="child">Page content</div>
      </AppShell>,
    )

    const headings = screen.getAllByRole("heading", { name: "Zaza Draft" })
    expect(headings.length).toBeGreaterThan(0)
    expect(screen.getByTestId("footer-slim")).toBeTruthy()
    expect(screen.getByTestId("child").textContent).toBe("Page content")
  })
})
