// @vitest-environment happy-dom

import type React from "react"

import "@testing-library/jest-dom"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => key,
  }),
}))

vi.mock("@/components/FooterSlim", () => ({
  __esModule: true,
  default: () => <footer>Footer</footer>,
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("Support page CTAs", () => {
  it("links to guides, community, and support contact", async () => {
    const { default: SupportPage } = await import("@/app/support/page")
    render(<SupportPage />)

    expect(screen.getByTestId("support-guides-link").closest("a")).toHaveAttribute(
      "href",
      "/guides",
    )
    expect(screen.getByTestId("support-community-link").closest("a")).toHaveAttribute(
      "href",
      "/community",
    )
    expect(screen.getByTestId("support-contact-link").closest("a")).toHaveAttribute(
      "href",
      "/support/contact",
    )
  })
})
