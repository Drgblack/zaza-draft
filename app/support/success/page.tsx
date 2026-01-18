"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function SupportSuccessContent() {
  const searchParams = useSearchParams()
  const ticketId = searchParams.get("ticket")
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async () => {
    if (!ticketId || typeof navigator === "undefined" || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(ticketId)
      setCopied(true)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch {
      setCopied(false)
    }
  }

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border bg-white/70 p-8 shadow-sm backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground" aria-live="polite">
          Support message sent
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Thanks - we have your message.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We aim to reply as soon as possible. If you hear from us, just mention the ticket below.
        </p>

        {ticketId ? (
          <div className="mt-6 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-3">
              <p className="flex items-center gap-2 font-mono text-xs tracking-wider text-foreground">
                Ticket ID:
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1">{ticketId}</span>
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Copy ticket ID
              </button>
            </div>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {copied ? "Copied" : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Go back to the app
          </Link>
          <Link
            href="/support/contact"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-foreground"
          >
            Send another message
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function SupportSuccessPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen px-4 py-10">
          <p className="text-sm text-muted-foreground">Loading confirmation...</p>
        </div>
      }
    >
      <SupportSuccessContent />
    </React.Suspense>
  )
}
