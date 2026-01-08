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

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a {...props} href={href}>
      {children}
    </a>
  ),
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

    const shell = screen.getByTestId("app-shell-root")
    expect(shell.className).toContain("text-foreground")
    expect(shell.className).toContain("isolate")
    expect(shell.className).not.toMatch(/text-white/)
    expect(shell.className).not.toMatch(/opacity-/)
    const bgElement = screen.getByTestId("app-shell-bg")
    expect(bgElement.className).toContain("app-gradient")
    expect(bgElement.className).toContain("app-gradient")
    expect(bgElement.className).toContain("linear-gradient")
    expect(bgElement.className).not.toContain("auth-gradient")
    expect(bgElement.className).not.toMatch(/-z-/)
    expect(screen.getByTestId("app-shell-accent").className).toContain("app-gradient-accent")
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

    const shell = screen.getByTestId("app-shell-root")
    expect(shell.className).not.toContain("bg-background")
    expect(shell.className).toContain("text-foreground")
    expect(screen.getByTestId("app-shell-bg").className).toContain("auth-gradient")
  })

  it("keeps the base styles in dark mode for app routes", () => {
    document.documentElement.classList.add("dark")
    render(
      <AppShell>
        <div data-testid="child">Page content</div>
      </AppShell>,
    )

    const shell = screen.getByTestId("app-shell-root")
    expect(shell.className).not.toContain("bg-background")
    expect(shell.className).toContain("text-foreground")
    expect(screen.getByTestId("app-shell-bg").className).toContain("app-gradient")
    document.documentElement.classList.remove("dark")
  })
})
