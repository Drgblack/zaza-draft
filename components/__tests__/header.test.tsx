// @vitest-environment happy-dom

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

const useAuthMock = vi.fn()

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
        "share": "Share",
        "auth.cta.signin": "Sign in",
        "account.menu.userMenu": "Account menu",
      }
      return translations[key] ?? key
    },
    formatDate: () => "",
    formatNumber: () => "",
  }),
}))

describe("Header gating", () => {
  afterEach(() => {
    useAuthMock.mockReset()
  })

  it("hides paywalled controls when unauthenticated", () => {
    useAuthMock.mockReturnValue({
      user: null,
      status: "unauthenticated",
      signOut: vi.fn(),
      signInWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      getIdToken: vi.fn().mockResolvedValue(null),
    })

    render(<Header title="Test" saveStatus="saved" onTitleChange={() => {}} />)

    expect(screen.queryByText("My insights")).toBeNull()
    expect(screen.queryByLabelText("Account menu")).toBeNull()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy()
  })

  it("shows paywalled controls when authenticated", () => {
    useAuthMock.mockReturnValue({
      user: { displayName: "Test User" },
      status: "authenticated",
      signOut: vi.fn(),
      signInWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      getIdToken: vi.fn().mockResolvedValue("token"),
    })

    render(<Header title="Test" saveStatus="saved" onTitleChange={() => {}} />)

    expect(screen.getByText("My insights")).toBeTruthy()
    expect(screen.getByLabelText("Account menu")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull()
  })

  it("links the brand block to the app home", () => {
    useAuthMock.mockReturnValue({
      user: null,
      status: "unauthenticated",
      signOut: vi.fn(),
      signInWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      getIdToken: vi.fn().mockResolvedValue(null),
    })

    render(<Header title="Zaza Draft" saveStatus="saved" onTitleChange={() => {}} />)

    expect(screen.getByRole("link", { name: "Go to Zaza Draft home" })).toHaveAttribute(
      "href",
      "https://app.zazadraft.com/",
    )
  })

  it("keeps the header sticky for long editor sessions", () => {
    useAuthMock.mockReturnValue({
      user: { displayName: "Test User" },
      status: "authenticated",
      signOut: vi.fn(),
      signInWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      signInWithGoogle: vi.fn(),
      getIdToken: vi.fn().mockResolvedValue("token"),
    })

    const { container } = render(<Header title="Test" saveStatus="saved" onTitleChange={() => {}} />)
    const banner = container.querySelector('header[role="banner"]')

    expect(banner?.className).toContain("sticky")
    expect(banner?.className).toContain("top-0")
    expect(banner?.className).toContain("z-40")
  })
})
