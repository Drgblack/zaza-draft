// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

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

describe("Support contact page", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it("renders localized heading (EN)", async () => {
    vi.doMock("@/hooks/use-locale", () => ({
      useLocale: () => ({
        locale: "en-GB",
        t: (key: string) => ({
          "support.contact.heading": "Contact Support",
          "support.contact.body": "Explain your issue and we will reply within a day.",
          "support.title": "Help & Support",
          "support.contact.primaryAction": "Go to contact form",
          "support.contact.secondaryAction": "Email support",
          "support.emailCta": "Email support",
          "support.contact.description": "Talk to our team.",
        }[key] ?? key),
      }),
    }))

    const { default: SupportContactPage } = await import("@/app/support/contact/page")
    render(<SupportContactPage />)

    expect(screen.getByTestId("support-contact-heading")).toHaveTextContent(
      "Contact Support",
    )
    expect(screen.getByTestId("support-contact-email-link")).toHaveAttribute(
      "href",
      "mailto:support@zazatechnologies.com",
    )
    expect(screen.getByTestId("support-contact-email-link")).toHaveTextContent("Email support")
  })

  it("renders localized heading (DE)", async () => {
    vi.doMock("@/hooks/use-locale", () => ({
      useLocale: () => ({
        locale: "de-DE",
        t: (key: string) => ({
          "support.contact.heading": "Support kontaktieren",
          "support.contact.body": "Beschreiben Sie Ihr Anliegen.",
          "support.title": "Hilfe & Support",
          "support.contact.primaryAction": "Zum Kontaktformular",
          "support.contact.secondaryAction": "Support per E-Mail",
          "support.emailCta": "Support per E-Mail",
          "support.contact.description": "Sprechen Sie mit uns.",
        }[key] ?? key),
      }),
    }))

    const { default: SupportContactPage } = await import("@/app/support/contact/page")
    render(<SupportContactPage />)

    expect(screen.getByTestId("support-contact-heading")).toHaveTextContent(
      "Support kontaktieren",
    )
    expect(screen.getByTestId("support-contact-email-link")).toHaveAttribute(
      "href",
      "mailto:support@zazatechnologies.com",
    )
    expect(screen.getByTestId("support-contact-email-link")).toHaveTextContent(
      "Support per E-Mail",
    )
  })
})
