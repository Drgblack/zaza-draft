// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PasswordResetScreen } from "@/components/auth/password-reset-screen"

const verifyPasswordResetCodeMock = vi.fn()
const confirmPasswordResetMock = vi.fn()

vi.mock("firebase/auth", () => ({
  verifyPasswordResetCode: (...args: unknown[]) => verifyPasswordResetCodeMock(...args),
  confirmPasswordReset: (...args: unknown[]) => confirmPasswordResetMock(...args),
}))

vi.mock("@/lib/firebase/client", () => ({
  auth: {},
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      const messages: Record<string, string> = {
        "auth.passwordReset.eyebrow": "Password reset",
        "auth.passwordReset.title": "Set a new password",
        "auth.passwordReset.checking": "Checking your password reset link...",
        "auth.passwordReset.helper":
          "Choose a new password for this account, then sign in on your phone or computer.",
        "auth.passwordReset.emailHint": `Resetting password for ${vars?.email ?? ""}`,
        "auth.passwordReset.newPassword": "New password",
        "auth.passwordReset.confirmPassword": "Confirm new password",
        "auth.passwordReset.minLength": "Use at least 8 characters for your new password.",
        "auth.passwordReset.mismatch": "Passwords do not match.",
        "auth.passwordReset.submit": "Save new password",
        "auth.passwordReset.submitting": "Saving new password...",
        "auth.passwordReset.expired":
          "This link has expired. Please request a new password reset.",
        "auth.passwordReset.failure":
          "We couldn’t update your password. Please request a new password reset.",
        "auth.passwordReset.weakPassword":
          "Choose a stronger password with at least 8 characters.",
        "auth.passwordReset.success": "Password updated. Sign in with your new password.",
        "auth.passwordReset.backToSignIn": "Back to sign in",
        auth_passwordPlaceholder: "Enter your password",
      }

      if (key === "auth.passwordPlaceholder") {
        return "Enter your password"
      }

      return messages[key] ?? key
    },
  }),
}))

describe("PasswordResetScreen", () => {
  beforeEach(() => {
    verifyPasswordResetCodeMock.mockReset()
    confirmPasswordResetMock.mockReset()
  })

  it("shows the expired-link message instead of a generic 404", async () => {
    verifyPasswordResetCodeMock.mockRejectedValue(new Error("expired"))

    render(<PasswordResetScreen oobCode="expired-code" />)

    expect(
      await screen.findByText("This link has expired. Please request a new password reset."),
    ).toBeInTheDocument()
  })

  it("allows a valid reset link to set a new password", async () => {
    verifyPasswordResetCodeMock.mockResolvedValue("shoshoshaer@gmail.com")
    confirmPasswordResetMock.mockResolvedValue(undefined)

    render(<PasswordResetScreen oobCode="valid-code" />)

    expect(await screen.findByText("Resetting password for shoshoshaer@gmail.com")).toBeInTheDocument()

    fireEvent.input(screen.getByLabelText("New password"), {
      target: { value: "NewPassword123" },
    })
    fireEvent.input(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPassword123" },
    })
    fireEvent.submit(screen.getByRole("button", { name: "Save new password" }).closest("form")!)

    await waitFor(() => {
      expect(confirmPasswordResetMock).toHaveBeenCalledWith({}, "valid-code", "NewPassword123")
    })

    expect(
      (await screen.findAllByText("Password updated. Sign in with your new password.")).length,
    ).toBeGreaterThan(0)
  })
})
