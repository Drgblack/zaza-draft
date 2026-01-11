// @vitest-environment happy-dom

import type React from "react"

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/hooks/use-locale", () => {
  const translations: Record<string, string> = {
    "support.title": "Help & Support",
    "guides.title": "Teaching guides",
    "guides.description": "Practical lesson plans.",
    "guides.back": "Back to support",
    "community.title": "Community forum",
    "community.description": "Connect with peers.",
    "community.back": "Back to support",
  }
  return {
    useLocale: () => ({
      locale: "en-GB",
      setLocale: vi.fn(),
      t: (key: string) => translations[key] ?? key,
    }),
  }
})

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("Guide and community hub pages", () => {
  it("renders guides content", async () => {
    const { default: GuidesPage } = await import("../../app/guides/page.tsx")
    render(<GuidesPage />)

    expect(screen.getByRole("heading", { name: "Teaching guides" })).toBeTruthy()
    expect(screen.getByText("Practical lesson plans.")).toBeTruthy()
  })

  it("renders community content", async () => {
    const { default: CommunityPage } = await import("../../app/community/page.tsx")
    render(<CommunityPage />)

    expect(screen.getByRole("heading", { name: "Community forum" })).toBeTruthy()
    expect(screen.getByText("Connect with peers.")).toBeTruthy()
  })
})
