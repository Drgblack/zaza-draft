import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

// Mock auth as signed-in
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      uid: "test-uid",
      email: "greg@zazatechnologies.com",
      getIdToken: async () => "test-token",
    },
    isAnonymous: false,
    loading: false,
    getIdToken: async () => "test-token",
  }),
}))

// Ensure the dev UID button is allowed to render (path may already exist in your repo)
vi.mock("@/lib/can-show-dev-uid", () => ({
  canShowDevUid: () => true,
}))

// Force DE locale + translations used in this test
vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "de",
    t: (key: string) => {
      const dict: Record<string, string> = {
        "account.devUid.copy": "UID kopieren",
        "account.devUid.copied": "UID kopiert",
      }
      return dict[key] ?? key
    },
  }),
}))

import AccountPage from "@/app/account/page"

describe("Account page localization", () => {
  it("shows German copy/feedback text for the UID button", async () => {
    render(<AccountPage />)

    // Button should exist in DE
    expect(
      await screen.findByRole("button", { name: "UID kopieren" })
    ).toBeTruthy()
  })
})
