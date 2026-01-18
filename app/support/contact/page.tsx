"use client"

import * as React from "react"

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success" }
  | { state: "error"; message: string }

export default function SupportContactPage() {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [company, setCompany] = React.useState("") // honeypot
  const [status, setStatus] = React.useState<Status>({ state: "idle" })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status.state === "loading") return

    setStatus({ state: "loading" })

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          company, // honeypot
        }),
      })

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        setStatus({
          state: "error",
          message:
            "Sorry - something went wrong. Please try again or email support@zazatechnologies.com.",
        })
        return
      }

      setStatus({ state: "success" })
      setMessage("")
      // keep name/email to reduce friction for follow-ups
    } catch {
      setStatus({
        state: "error",
        message:
          "Sorry - something went wrong. Please try again or email support@zazatechnologies.com.",
      })
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Contact support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send us a message and we will get back to you as soon as possible.
        </p>

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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Honeypot: hide from humans, visible to bots */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div aria-live="polite" className="min-h-[24px] text-sm">
            {status.state === "success" ? (
              <p className="text-green-700">
                Thanks - your message has been sent. We will reply shortly.
              </p>
            ) : null}
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
