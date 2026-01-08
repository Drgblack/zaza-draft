// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { Header } from "@/components/header"

const useRouterMock = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock,
  usePathname: () => "/",
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a {...props} href={href}>
      {children}
    </a>
  ),
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
    useRouterMock.push.mockReset()
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

    const insightsLink = screen.getByRole("link", { name: "View my insights" })
    expect(insightsLink).toBeTruthy()
    const insightsLinkByTestId = screen.getByTestId("header-insights-link")
    expect(insightsLinkByTestId).toBe(insightsLink)
    expect(insightsLink.getAttribute("href")).toBe("/insights")
    expect(screen.getByLabelText("Account menu")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull()
  })
})
