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
          "Enter your school or preferred email. We’ll send you a secure sign-in link. If your account already exists, no new activation code is needed.",
        "auth.title.signin": "Email sign-in",
        "auth.emailLabel": "Email",
        "auth.mode.emailLink": "Email link",
        "auth.mode.password": "Password",
        "auth.emailLink.helper":
          "Enter your school or preferred email. We’ll send you a secure sign-in link. If your account already exists, no new activation code is needed.",
        "auth.emailLink.inputHelper":
          "We’ll email a one-time sign-in link to this address. If the old link expired, use the same email again.",
        "auth.emailLink.successTitle": "Check your inbox",
        "auth.emailLink.sent": `We've sent a secure sign-in link to ${vars?.email ?? ""}.`,
        "auth.emailLink.sentHint": "Open it on this device to continue.",
        "auth.emailLink.confirmTitle": "Confirm your email",
        "auth.emailLink.confirmDescription":
          "We couldn’t find the saved email for this sign-in link. Enter it again to continue securely.",
        "auth.emailLink.confirmHelper": "Use the same email address that requested the link.",
        "auth.emailLink.recoveryTitle": "Link expired or already used",
        "auth.emailLink.recoveryDescriptionKnown":
          "This sign-in link has expired or has already been used. We can send you a fresh one right away.",
        "auth.emailLink.recoveryDescriptionUnknown":
          "This sign-in link has expired or has already been used. Enter the same email address and we’ll send you a fresh one.",
        "auth.emailLink.recoveryHelperKnown":
          "We’ll send a fresh secure sign-in link to this address.",
        "auth.emailLink.recoveryHelperUnknown":
          "Enter the same email address and we’ll send you a fresh sign-in link.",
        "auth.emailLink.recoveryNotice":
          "The sign-in link you opened can only be used once and may have expired.",
        "auth.emailLink.processing": "Checking your secure sign-in link...",
        "auth.passwordLabel": "Password",
        "auth.password.helper":
          "Use your password if you already have one. If not, choose Forgot password? to set a fresh one for this account.",
        "auth.password.inputHelper":
          "Account already exists? Sign in with your password or reset it. No new activation code is needed.",
        "auth.passwordPlaceholder": "Enter your password",
        "auth.password.cta": "Sign in with password",
        "auth.password.processing": "Signing you in...",
        "auth.password.resetTitle": "Check your inbox",
        "auth.password.resetSent": `We’ve sent a password reset email to ${vars?.email ?? ""}.`,
        "auth.password.resetHint":
          "Use the link in that email to set a password, then sign in here.",
        "auth.cta.sendLink": "Send sign-in link",
        "auth.cta.sendNewLink": "Send a new sign-in link",
        "auth.cta.resendLink": "Resend sign-in link",
        "auth.cta.completeEmailLink": "Complete sign in",
        "auth.cta.forgot": "Forgot password?",
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
        "auth.error.passwordSignInFailed":
          "We couldn’t sign you in with that password. Check your details or reset your password.",
        "auth.error.passwordResetFailed":
          "We couldn’t send the password reset email right now. Please try again.",
        "auth.orContinue": "Or continue with",
        "auth.continueWithGoogle": "Continue with Google",
        "auth.loading": "Signing you in...",
      }

      return messages[key] ?? key
    },
  }),
}))

vi.mock("@/lib/analytics", () => ({
  TRUST_FUNNEL_EVENTS: {
    landingCtaHandoffCompleted: "landing_cta_handoff_completed",
    magicLinkRequested: "magic_link_requested",
    magicLinkRequestSucceeded: "magic_link_request_succeeded",
    magicLinkRequestFailed: "magic_link_request_failed",
  },
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

  function baseAuthState(overrides: Record<string, unknown> = {}) {
    return {
      status: "unauthenticated",
      emailLinkStatus: "idle",
      emailLinkKnownEmail: null,
      emailLinkRecoveryReason: null,
      sendEmailLink: vi.fn(),
      completeEmailLinkSignIn: vi.fn(),
      signInWithPassword: vi.fn(),
      sendPasswordReset: vi.fn(),
      signInWithGoogle: vi.fn(),
      ...overrides,
    }
  }

  it("renders the passwordless email-link flow as the primary auth option", () => {
    useAuthMock.mockReturnValue(baseAuthState())

    render(<AuthScreen />)

    expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()
    expect(screen.getByText("Continue with Google")).toBeInTheDocument()
    expect(
      screen.getAllByText(
        "Enter your school or preferred email. We’ll send you a secure sign-in link. If your account already exists, no new activation code is needed.",
      ).length,
    ).toBeGreaterThan(0)
  })

  it("sends a login link and shows the success state", async () => {
    const sendEmailLink = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue(baseAuthState({ sendEmailLink }))

    render(<AuthScreen />)

    const emailInput = screen.getByLabelText("Email")
    fireEvent.input(emailInput, {
      target: { value: "teacher@example.com" },
    })
    fireEvent.submit(emailInput.closest("form")!)

    await waitFor(() => {
      expect(sendEmailLink).toHaveBeenCalledWith("teacher@example.com")
    })

    expect(logClientEventMock).toHaveBeenCalledWith("magic_link_requested", {
      surface: "auth_screen",
      resend: false,
    })
    expect(logClientEventMock).toHaveBeenCalledWith("magic_link_request_succeeded", {
      surface: "auth_screen",
      resend: false,
    })

    expect(screen.getByText("Check your inbox")).toBeInTheDocument()
    expect(
      screen.getByText("We've sent a secure sign-in link to teacher@example.com."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resend sign-in link" })).toBeInTheDocument()
  })

  it("prompts for the email again when returning from a sign-in link without local email", async () => {
    const completeEmailLinkSignIn = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue(
      baseAuthState({
        emailLinkStatus: "awaiting_email",
        completeEmailLinkSignIn,
      }),
    )

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

  it("tracks the landing CTA handoff into the auth form", () => {
    useAuthMock.mockReturnValue(baseAuthState())

    render(<AuthScreen />)

    fireEvent.click(screen.getByRole("button", { name: "Instant draft CTA" }))

    expect(logClientEventMock).toHaveBeenCalledWith("landing_cta_handoff_completed", {
      source: "instant_draft_test",
    })
  })

  it("tracks magic-link request failures", async () => {
    const sendEmailLink = vi.fn().mockRejectedValue({ code: "auth/argument-error" })

    useAuthMock.mockReturnValue(baseAuthState({ sendEmailLink }))

    render(<AuthScreen />)

    const emailInput = screen.getByLabelText("Email")
    fireEvent.input(emailInput, {
      target: { value: "teacher@example.com" },
    })
    fireEvent.submit(emailInput.closest("form")!)

    await waitFor(() => {
      expect(sendEmailLink).toHaveBeenCalledWith("teacher@example.com")
    })

    expect(logClientEventMock).toHaveBeenCalledWith("magic_link_request_failed", {
      surface: "auth_screen",
      resend: false,
      code: "auth/argument-error",
    })
  })

  it("shows a recovery state for an expired sign-in link with the known email prefilled", () => {
    useAuthMock.mockReturnValue(
      baseAuthState({
        emailLinkStatus: "recovery",
        emailLinkKnownEmail: "teacher@example.com",
        emailLinkRecoveryReason: "expired_or_used",
      }),
    )

    render(<AuthScreen />)

    expect(screen.getAllByText("Link expired or already used").length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        "This sign-in link has expired or has already been used. We can send you a fresh one right away.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue("teacher@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send a new sign-in link" })).toBeInTheDocument()
  })

  it("shows a recovery state for an already-used sign-in link when the email is unknown", () => {
    useAuthMock.mockReturnValue(
      baseAuthState({
        emailLinkStatus: "recovery",
        emailLinkRecoveryReason: "expired_or_used",
      }),
    )

    render(<AuthScreen />)

    expect(screen.getAllByText("Link expired or already used").length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        "This sign-in link has expired or has already been used. Enter the same email address and we’ll send you a fresh one.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter the same email address and we’ll send you a fresh sign-in link."),
    ).toBeInTheDocument()
  })

  it("resends a fresh link directly from the recovery state", async () => {
    const sendEmailLink = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue(
      baseAuthState({
        emailLinkStatus: "recovery",
        emailLinkKnownEmail: "teacher@example.com",
        emailLinkRecoveryReason: "expired_or_used",
        sendEmailLink,
      }),
    )

    render(<AuthScreen />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("teacher@example.com")).toBeInTheDocument()
    })

    fireEvent.submit(screen.getByLabelText("Email").closest("form")!)

    await waitFor(() => {
      expect(sendEmailLink).toHaveBeenCalledWith("teacher@example.com")
    })

    expect(logClientEventMock).toHaveBeenCalledWith("magic_link_requested", {
      surface: "auth_screen",
      resend: true,
    })
    expect(logClientEventMock).toHaveBeenCalledWith("magic_link_request_succeeded", {
      surface: "auth_screen",
      resend: true,
    })
    await waitFor(() => {
      expect(
        screen.getByText("We've sent a secure sign-in link to teacher@example.com."),
      ).toBeInTheDocument()
    })
  })

  it("supports password reset from password mode", async () => {
    const sendPasswordReset = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue(baseAuthState({ sendPasswordReset }))

    render(<AuthScreen />)

    fireEvent.click(screen.getByRole("button", { name: "Password" }))
    fireEvent.input(screen.getByLabelText("Email"), {
      target: { value: "teacher@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }))

    await waitFor(() => {
      expect(sendPasswordReset).toHaveBeenCalledWith("teacher@example.com")
    })

    await waitFor(() => {
      expect(
        screen.getByText("We’ve sent a password reset email to teacher@example.com."),
      ).toBeInTheDocument()
    })
  })
})
