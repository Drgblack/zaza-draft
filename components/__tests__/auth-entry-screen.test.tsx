// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthEntryScreen } from "@/components/auth/auth-entry-screen"

const searchParamsState = new URLSearchParams()
const useAuthMock = vi.fn()

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsState,
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        loading: "Loading...",
        "auth.passwordReset.successTitle": "Password updated",
        "auth.passwordReset.signInPrompt":
          "Your password has been updated. Sign in with your new password.",
        "auth.actionLink.noticeTitle": "Account action",
        "auth.actionLink.verifyEmailNotice":
          "This email verification link should open the sign-in screen. If it has expired, request a fresh sign-in or password reset.",
        "auth.actionLink.recoverEmailNotice":
          "This account recovery link should open the sign-in screen. If it has expired, request a fresh password reset.",
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock("@/components/entitlements/useDraftEntitlement", () => ({
  useDraftEntitlement: () => ({
    entitlement: null,
    loading: false,
    error: null,
    hasAccess: false,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/components/auth/auth-screen", () => ({
  AuthScreen: ({
    initialMode,
    initialEmail,
    banner,
  }: {
    initialMode?: string
    initialEmail?: string
    banner?: { title?: string; message: string }
  }) => (
    <div>
      <p>Auth screen</p>
      <p>mode:{initialMode ?? "email_link"}</p>
      <p>email:{initialEmail ?? ""}</p>
      {banner?.title && <p>{banner.title}</p>}
      {banner?.message && <p>{banner.message}</p>}
    </div>
  ),
}))

vi.mock("@/components/auth/password-reset-screen", () => ({
  PasswordResetScreen: ({ oobCode }: { oobCode: string | null }) => (
    <div>Password reset screen:{oobCode ?? "missing"}</div>
  ),
}))

vi.mock("@/components/main-editor", () => ({
  MainEditor: () => <div>Main editor</div>,
}))

vi.mock("@/components/entitlements/EntitlementGate", () => ({
  EntitlementGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe("AuthEntryScreen", () => {
  beforeEach(() => {
    searchParamsState.forEach((_, key) => searchParamsState.delete(key))
    useAuthMock.mockReset()
  })

  it("renders the normal auth screen for unauthenticated users on the root/login entry", () => {
    useAuthMock.mockReturnValue({ status: "unauthenticated" })

    render(<AuthEntryScreen />)

    expect(screen.getByText("Auth screen")).toBeInTheDocument()
    expect(screen.getByText("mode:email_link")).toBeInTheDocument()
  })

  it("routes password-reset action links into the reset screen instead of a 404", () => {
    searchParamsState.set("mode", "resetPassword")
    searchParamsState.set("oobCode", "abc123")
    useAuthMock.mockReturnValue({ status: "unauthenticated" })

    render(<AuthEntryScreen />)

    expect(screen.getByText("Password reset screen:abc123")).toBeInTheDocument()
  })

  it("shows the password sign-in screen with a success banner after a completed reset", () => {
    searchParamsState.set("reset", "success")
    searchParamsState.set("email", "shoshoshaer@gmail.com")
    useAuthMock.mockReturnValue({ status: "unauthenticated" })

    render(<AuthEntryScreen />)

    expect(screen.getByText("Auth screen")).toBeInTheDocument()
    expect(screen.getByText("mode:password")).toBeInTheDocument()
    expect(screen.getByText("email:shoshoshaer@gmail.com")).toBeInTheDocument()
    expect(screen.getByText("Password updated")).toBeInTheDocument()
    expect(
      screen.getByText("Your password has been updated. Sign in with your new password."),
    ).toBeInTheDocument()
  })
})
