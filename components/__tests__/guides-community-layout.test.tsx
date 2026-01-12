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

describe("Guides and community layouts", () => {
  it("guides page has flex layout", async () => {
    const { default: GuidesPage } = await import("@/app/guides/page.tsx")
    render(<GuidesPage />)
    expect(screen.getByTestId("guides-main")).toHaveClass("flex-1")
  })

  it("community page has flex layout", async () => {
    const { default: CommunityPage } = await import("@/app/community/page.tsx")
    render(<CommunityPage />)
    expect(screen.getByTestId("community-main")).toHaveClass("flex-1")
  })
})
