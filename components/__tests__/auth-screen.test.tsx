// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthScreen } from "@/components/auth/auth-screen"

const useAuthMock = vi.fn()
const logClientEventMock = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      const messages: Record<string, string> = {
        "auth.marketingEyebrow": "Teacher-safe writing",
        "auth.title": "Welcome back",
        "auth.description":
          "Enter your email and we’ll send a secure sign-in link. Open it on this device to continue.",
        "auth.title.signin": "Email sign-in",
        "auth.emailLabel": "Email",
        "auth.emailLink.helper":
          "Use your school or preferred email. We’ll send a secure link instead of asking for a password.",
        "auth.emailLink.inputHelper": "We’ll email a one-time sign-in link to this address.",
        "auth.emailLink.sent": `We sent a secure sign-in link to ${vars?.email ?? ""}.`,
        "auth.emailLink.sentHint": "Open the email on this device to finish signing in.",
        "auth.emailLink.confirmTitle": "Confirm your email",
        "auth.emailLink.confirmDescription":
          "We couldn’t find the saved email for this sign-in link. Enter it again to continue securely.",
        "auth.emailLink.confirmHelper": "Use the same email address that requested the link.",
        "auth.emailLink.processing": "Checking your secure sign-in link...",
        "auth.cta.sendLink": "Send login link",
        "auth.cta.resendLink": "Resend login link",
        "auth.cta.completeEmailLink": "Complete sign in",
        "auth.processing.sendLink": "Sending secure link...",
        "auth.processing.completeLink": "Signing you in...",
        "auth.error.invalidEmail": "Enter a valid email address.",
        "auth.error.linkExpired": "This sign-in link is no longer valid. Request a new one.",
        "auth.error.linkFailed":
          "We couldn’t complete that sign-in link. Request a new one and try again.",
        "auth.error.sendLinkFailed":
          "We couldn’t send the sign-in link right now. Please try again.",
        "auth.error.linkConfig":
          "Email-link sign-in isn’t configured correctly for this deployment.",
        "auth.orContinue": "Or continue with",
        "auth.continueWithGoogle": "Continue with Google",
        "auth.loading": "Signing you in...",
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock("@/lib/analytics", () => ({
  logClientEvent: (...args: unknown[]) => logClientEventMock(...args),
}))

vi.mock("@/components/marketing/instant-draft-test", () => ({
  InstantDraftTest: ({ onCreateAccount }: { onCreateAccount: () => void }) => (
    <button type="button" onClick={onCreateAccount}>
      Instant draft CTA
    </button>
  ),
}))

describe("AuthScreen", () => {
  afterEach(() => {
    useAuthMock.mockReset()
    logClientEventMock.mockReset()
  })

  it("renders the passwordless email-link flow as the primary auth option", () => {
    useAuthMock.mockReturnValue({
      status: "unauthenticated",
      emailLinkStatus: "idle",
      sendEmailLink: vi.fn(),
      completeEmailLinkSignIn: vi.fn(),
      signInWithGoogle: vi.fn(),
    })

    render(<AuthScreen />)

    expect(screen.getByRole("button", { name: "Send login link" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()
    expect(screen.getByText("Continue with Google")).toBeInTheDocument()
  })

  it("sends a login link and shows the success state", async () => {
    const sendEmailLink = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue({
      status: "unauthenticated",
      emailLinkStatus: "idle",
      sendEmailLink,
      completeEmailLinkSignIn: vi.fn(),
      signInWithGoogle: vi.fn(),
    })

    render(<AuthScreen />)

    const emailInput = screen.getByLabelText("Email")
    fireEvent.input(emailInput, {
      target: { value: "teacher@example.com" },
    })
    fireEvent.submit(emailInput.closest("form")!)

    await waitFor(() => {
      expect(sendEmailLink).toHaveBeenCalledWith("teacher@example.com")
    })

    expect(
      screen.getByText("We sent a secure sign-in link to teacher@example.com."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resend login link" })).toBeInTheDocument()
  })

  it("prompts for the email again when returning from a sign-in link without local email", async () => {
    const completeEmailLinkSignIn = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue({
      status: "unauthenticated",
      emailLinkStatus: "awaiting_email",
      sendEmailLink: vi.fn(),
      completeEmailLinkSignIn,
      signInWithGoogle: vi.fn(),
    })

    render(<AuthScreen />)

    expect(screen.getByText("Confirm your email")).toBeInTheDocument()

    const emailInput = screen.getByLabelText("Email")
    fireEvent.input(emailInput, {
      target: { value: "teacher@example.com" },
    })
    fireEvent.submit(emailInput.closest("form")!)

    await waitFor(() => {
      expect(completeEmailLinkSignIn).toHaveBeenCalledWith("teacher@example.com")
    })
    expect(logClientEventMock).toHaveBeenCalledWith("auth_login_success", {
      provider: "email_link",
    })
  })
})
