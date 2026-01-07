// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    setLocale: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        "account.backToApp": "Back to Zaza Draft",
        "support.title": "Help & Support",
        "support.description": "Get help with Zaza Draft",
        "support.guides.title": "Teaching Guides",
        "support.guides.description": "Learn best practices and teaching strategies",
        "support.guides.button": "Browse guides",
        "support.community.title": "Community Forum",
        "support.community.description": "Connect with other teachers and share ideas",
        "support.community.button": "Join community",
        "support.contact.title": "Contact Support",
        "support.contact.description": "Get in touch with our support team",
        "support.contact.button": "Contact us",
      }
      return translations[key] ?? key
    },
    formatDate: () => "",
    formatNumber: () => "",
  }),
}))

import SupportPage from "@/app/support/page"

describe("Support page actions", () => {
  it("links to the guides, community, and contact experiences", () => {
    render(<SupportPage />)

    const guidesLink = screen.getByRole("link", { name: /Browse guides/i })
    expect(guidesLink.getAttribute("href")).toBe("/support/guides")

    const communityLink = screen.getByRole("link", { name: /Join community/i })
    expect(communityLink.getAttribute("href")).toBe("/support/community")

    const contactLink = screen.getByRole("link", { name: /Contact us/i })
    expect(contactLink.getAttribute("href")).toBe("/support/contact")
  })
})
