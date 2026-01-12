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
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("Guides page links", () => {
  it("renders CTA links with the expected destinations", async () => {
    const { default: GuidesPage } = await import("@/app/guides/page")
    render(<GuidesPage />)

    expect(screen.getByTestId("guides-card-1")).toHaveAttribute("href", "/guides/drafting-tips")
    expect(screen.getByTestId("guides-card-2")).toHaveAttribute("href", "/guides/insights-review")
    expect(screen.getByTestId("guides-card-3")).toHaveAttribute("href", "/guides/privacy-checklist")
    expect(screen.getByTestId("guides-card-4")).toHaveAttribute("href", "/guides/feedback-tone")
  })
})
