import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// Force German locale for the test
vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "de-DE",
    t: (key: string) => {
      const map: Record<string, string> = {
        "account.signInRequired.title": "Anmeldung erforderlich",
        "account.signInRequired.description": "Bitte melde dich an, um dein Konto zu verwalten.",
        "account.signInRequired.action": "Anmelden",
      }
      return map[key] ?? key
    },
  }),
}))

// Ensure Account page renders signed-out state
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    isAnonymous: true,
    loading: false,
    getIdToken: async () => null,
  }),
}))

describe("Account page localization", () => {
  it("shows German sign-in required card when signed out", async () => {
    const { default: AccountPage } = await import("@/app/account/page")
    render(<AccountPage />)

    expect(screen.getByText("Anmeldung erforderlich")).toBeInTheDocument()
    expect(screen.getByText("Bitte melde dich an, um dein Konto zu verwalten.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument()
  })
})
