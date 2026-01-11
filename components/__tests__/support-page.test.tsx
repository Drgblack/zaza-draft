// @vitest-environment happy-dom

import type React from "react"

import "@testing-library/jest-dom"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("Support page navigation", () => {
  it("renders links for all CTA cards", async () => {
    const { default: SupportPage } = await import("@/app/support/page")
    render(<SupportPage />)

    const guidesButton = screen.getByTestId("support-guides-link")
    const communityButton = screen.getByTestId("support-community-link")
    const contactButton = screen.getByTestId("support-contact-link")

    expect(guidesButton.closest("a")).toHaveAttribute("href", "/guides")
    expect(communityButton.closest("a")).toHaveAttribute("href", "/community")
    expect(contactButton.closest("a")).toHaveAttribute("href", "/support/contact")
  })
})
