import "server-only"

import type { NextRequest } from "next/server"
import { createHash } from "crypto"

import { generateSupportTicketId, SUPPORT_SOURCE } from "@/lib/support/contact"
import { logSupportTicketToFirestore } from "@/lib/support/firestore"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NAME_MAX = 120
const EMAIL_MAX = 254
const MESSAGE_MAX = 4000
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5

const rateLimitStore = new Map<string, number[]>()

function getRateLimitKey(req: NextRequest) {
  const xForwardedFor = req.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim()
  }

  const ip = (req as { ip?: string }).ip
  if (ip) {
    return ip
  }

  const userAgent = req.headers.get("user-agent") ?? ""
  const acceptLanguage = req.headers.get("accept-language") ?? ""
  return createHash("sha256").update(`${userAgent}|${acceptLanguage}`).digest("hex")
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }) as Record<string, string>)[c],
  )
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(req)
    const now = Date.now()
    const history = rateLimitStore.get(rateLimitKey) ?? []
    const windowed = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
    if (windowed.length >= RATE_LIMIT_MAX) {
      return Response.json(
        { ok: false, error: "rate_limited", message: "Too many messages. Please wait a few minutes and try again." },
        { status: 429 },
      )
    }
    windowed.push(now)
    rateLimitStore.set(rateLimitKey, windowed)

    const body = await req.json()
    const nameRaw = typeof body?.name === "string" ? body.name : ""
    const emailRaw = typeof body?.email === "string" ? body.email : ""
    const messageRaw = typeof body?.message === "string" ? body.message : ""
    const company = typeof body?.company === "string" ? body.company : ""

    if (company) {
      return Response.json({ ok: false, error: "Invalid submission" }, { status: 400 })
    }

    const name = nameRaw.trim()
    const email = emailRaw.trim()
    const message = messageRaw.trim()

    if (!name || !email || !message) {
      return Response.json({ ok: false, error: "Missing fields" }, { status: 400 })
    }

    if (name.length > NAME_MAX) {
      return Response.json({ ok: false, error: "Name too long" }, { status: 400 })
    }

    if (email.length > EMAIL_MAX) {
      return Response.json({ ok: false, error: "Email too long" }, { status: 400 })
    }

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ ok: false, error: "Invalid email" }, { status: 400 })
    }

    if (message.length > MESSAGE_MAX) {
      return Response.json({ ok: false, error: "Message too long" }, { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY?.trim()
    const defaultEmail = "support@zazatechnologies.com"
    const fromEmail = process.env.BREVO_FROM_EMAIL?.trim() || defaultEmail
    const toEmail = process.env.BREVO_TO_EMAIL?.trim() || defaultEmail
    const missingConfig = {
      apiKey: !process.env.BREVO_API_KEY?.trim(),
      fromEmail: !process.env.BREVO_FROM_EMAIL?.trim(),
      toEmail: !process.env.BREVO_TO_EMAIL?.trim(),
    }

    if (!apiKey || !fromEmail || !toEmail) {
      const missing = Object.entries(missingConfig)
        .filter(([, isMissing]) => isMissing)
        .map(([key]) => key)
        .join(", ")
      console.error(`[contact] Missing Brevo config: ${missing}`)
      return Response.json({ ok: false, error: "Email service not configured" }, { status: 500 })
    }

    const ticketId = generateSupportTicketId()
    const createdAt = new Date().toISOString()
    const acceptLanguage = req.headers.get("accept-language")
    const locale = acceptLanguage ? acceptLanguage.split(",")[0].trim() : null
    const userAgent = req.headers.get("user-agent")
    const forwardedFor = req.headers.get("x-forwarded-for")
    const ip = forwardedFor?.split(",")[0]?.trim() ?? null
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null

    if (process.env.NODE_ENV === "test") {
      return Response.json({ ok: true, ticketId })
    }

    const htmlContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.4;">
        <h1 style="margin-bottom:0.5rem">Support ticket ${escapeHtml(ticketId)}</h1>
        <p style="margin-top:0;margin-bottom:1rem">Source: ${escapeHtml(SUPPORT_SOURCE)}</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
      </div>
    `

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        to: [{ email: toEmail, name: "Zaza Support" }],
        sender: { email: fromEmail, name: "Zaza Draft Support" },
        subject: `[${ticketId}] Support request from ${name}`,
        htmlContent,
        replyTo: { email, name },
        headers: {
          "X-Zaza-Source": SUPPORT_SOURCE,
          "X-Zaza-Ticket": ticketId,
        },
        params: {
          source: SUPPORT_SOURCE,
          ticketId,
        },
      }),
    })

    if (!emailResponse.ok) {
      const bodyText = await emailResponse.text().catch(() => "")
      console.error(`[contact] Brevo email failed (${emailResponse.status}): ${bodyText}`)
      throw new Error("Failed to send message")
    }

    const listId = Number(process.env.BREVO_LIST_ID || 0)
    if (listId > 0) {
      try {
        await fetch("https://api.brevo.com/v3/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            email,
            listIds: [listId],
            attributes: {
              FIRSTNAME: name,
              SOURCE: SUPPORT_SOURCE,
              LAST_MESSAGE_AT: createdAt,
              TICKET_ID: ticketId,
            },
            updateEnabled: true,
          }),
        })
      } catch (error) {
        console.error("[contact] Failed to update Brevo contact list", error)
      }
    }

    let firestoreDocId: string | null = null
    try {
      firestoreDocId = await logSupportTicketToFirestore({
        ticketId,
        name,
        email,
        message,
        locale,
        source: SUPPORT_SOURCE,
        userAgent,
        ipHash,
      })
    } catch (error) {
      console.error("[contact] Firestore logging failed", error)
    }

    const lindyUrl = process.env.LINDY_WEBHOOK_URL?.trim()
    if (lindyUrl) {
      try {
        await fetch(lindyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            source: SUPPORT_SOURCE,
            name,
            email,
            message,
            createdAt,
            firestoreDocId: firestoreDocId ?? undefined,
          }),
        })
      } catch (error) {
        console.error("[contact] Lindy webhook failed", error)
      }
    }

    return Response.json({ ok: true, ticketId })
  } catch (err) {
    console.error("Contact error", err)
    return Response.json({ ok: false, error: "Failed to send message" }, { status: 500 })
  }
}
