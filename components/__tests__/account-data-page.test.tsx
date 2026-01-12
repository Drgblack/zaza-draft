// @vitest-environment happy-dom

import "@testing-library/jest-dom"

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { LanguageProvider } from "@/hooks/use-locale"

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    getIdToken: vi.fn().mockResolvedValue("token"),
    signOut: vi.fn(),
  }),
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("Account data spacing and localization", () => {
  it("renders with reduced padding and German heading", async () => {
    const { default: DataPage } = await import("../../app/account/data/page.tsx")
    localStorage.setItem("zaza.lang", "de-DE")
    render(
      <LanguageProvider>
        <DataPage />
      </LanguageProvider>,
    )

    const container = screen.getByTestId("account-data-container")
    expect(container.className).toContain("py-5")
    expect(screen.getByRole("heading", { name: "Meine Daten" })).toBeInTheDocument()
  })
  afterEach(() => {
    localStorage.clear()
  })
})
