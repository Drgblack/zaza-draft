import "server-only"

import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const NAME_MAX = 120
const EMAIL_MAX = 254
const MESSAGE_MAX = 4000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nameRaw = typeof body?.name === "string" ? body.name : ""
    const emailRaw = typeof body?.email === "string" ? body.email : ""
    const messageRaw = typeof body?.message === "string" ? body.message : ""
    const company = typeof body?.company === "string" ? body.company : ""

    // Honeypot spam trap
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
    if (message.length > MESSAGE_MAX) {
      return Response.json({ ok: false, error: "Message too long" }, { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      return Response.json({ ok: false, error: "Email not configured" }, { status: 500 })
    }

    const toEmail = (process.env.BREVO_TO_EMAIL || "support@zazatechnologies.com").trim()
    const fromEmail = (process.env.BREVO_FROM_EMAIL || "support@zazatechnologies.com").trim()

    const Sib = (await import("sib-api-v3-sdk")).default

    const client = Sib.ApiClient.instance
    client.authentications["api-key"].apiKey = apiKey

    const tranEmailApi = new Sib.TransactionalEmailsApi()

    await tranEmailApi.sendTransacEmail({
      to: [{ email: toEmail, name: "Zaza Support" }],
      sender: { email: fromEmail, name: "Zaza Draft" },
      subject: `New contact from ${name}`,
      htmlContent: `
        <h2>New contact message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
      `,
      replyTo: { email, name },
    })

    const listId = Number(process.env.BREVO_LIST_ID || 0)
    if (listId > 0) {
      const contactsApi = new Sib.ContactsApi()
      await contactsApi.createContact({
        email,
        attributes: {
          FIRSTNAME: name,
          SOURCE: "zaza-draft-app",
          LAST_MESSAGE_AT: new Date().toISOString(),
        },
        updateEnabled: true,
        listIds: [listId],
      })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error("Contact error", err)
    return Response.json({ ok: false, error: "Failed to send message" }, { status: 500 })
  }
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }) as any)[c],
  )
}
