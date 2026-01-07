// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const useRouterMock = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}

const usePathnameMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock,
  usePathname: () => usePathnameMock(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
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
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/")
    useAuthMock.mockReturnValue({
      user: { displayName: "Test User" },
      status: "authenticated",
      signOut: vi.fn(),
      signInWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      getIdToken: vi.fn(),
    })
  })

  it("applies the app theme on editor routes", () => {
    render(
      <AppShell>
        <div data-testid="child">Page content</div>
      </AppShell>,
    )

    const shell = screen.getByTestId("app-shell")
    expect(shell.className).toContain("bg-background")
    expect(shell.className).toContain("text-foreground")
    expect(shell.className).not.toMatch(/text-white/)
    expect(shell.className).not.toMatch(/opacity-/)
    expect(screen.queryByTestId("auth-overlay")).toBeNull()
    expect(screen.getByTestId("app-overlay")).toBeTruthy()
    expect(screen.getByTestId("footer-slim")).toBeTruthy()
    expect(screen.getByTestId("child").textContent).toBe("Page content")
  })

  it("applies the auth theme when unauthenticated", () => {
    usePathnameMock.mockReturnValue("/auth/login")
    useAuthMock.mockReturnValue({
      user: null,
      status: "unauthenticated",
      signOut: vi.fn(),
      signInWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      getIdToken: vi.fn(),
    })

    render(
      <AppShell>
        <div data-testid="child">Page content</div>
      </AppShell>,
    )

    const shell = screen.getByTestId("app-shell")
    expect(shell.className).toContain("bg-background")
    expect(shell.className).toContain("text-foreground")
    expect(screen.queryByTestId("app-overlay")).toBeNull()
    expect(screen.getByTestId("auth-overlay")).toBeTruthy()
  })

  it("keeps the base styles in dark mode for app routes", () => {
    document.documentElement.classList.add("dark")
    render(
      <AppShell>
        <div data-testid="child">Page content</div>
      </AppShell>,
    )

    const shell = screen.getByTestId("app-shell")
    expect(shell.className).toContain("bg-background")
    expect(shell.className).toContain("text-foreground")
    expect(screen.getByTestId("app-overlay")).toBeTruthy()
    document.documentElement.classList.remove("dark")
  })
})
