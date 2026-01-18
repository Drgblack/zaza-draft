"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useLocale } from "@/hooks/use-locale"

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }

const ERROR_MESSAGE =
  "Sorry - something went wrong. Please try again or email support@zazatechnologies.com."

export default function SupportContactPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [company, setCompany] = React.useState("")
  const [status, setStatus] = React.useState<Status>({ state: "idle" })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status.state === "loading") {
      return
    }

    setStatus({ state: "loading" })

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          company,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        ticketId?: string
        message?: string
      }

      if (!res.ok || !data.ok || !data.ticketId) {
        const friendlyMessage = data.message ?? ERROR_MESSAGE
        setStatus({ state: "error", message: friendlyMessage })
        return
      }

      router.push(`/support/success?ticket=${encodeURIComponent(data.ticketId)}`)
    } catch {
      setStatus({ state: "error", message: ERROR_MESSAGE })
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              data-testid="support-contact-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              {t("support.contact.heading")}
            </h1>
            <a
              data-testid="support-contact-email-link"
              href="mailto:support@zazatechnologies.com"
              className="text-sm font-medium text-black underline"
            >
              {t("support.contact.secondaryAction")}
            </a>
          </div>
          <p className="text-sm text-black">{t("support.contact.body")}</p>
          <p className="text-sm text-black">{t("support.contact.description")}</p>
        </header>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              maxLength={4000}
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="hidden" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div aria-live="polite" className="min-h-[24px] text-sm text-left">
            {status.state === "error" ? <p className="text-red-700">{status.message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={status.state === "loading"}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {status.state === "loading" ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>
    </main>
  )
}
