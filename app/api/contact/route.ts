import "server-only"

import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, company } = await req.json()

    if (company) {
      return new Response(JSON.stringify({ error: "Invalid submission" }), { status: 400 })
    }

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500 })
    }

    const Sib = (await import("sib-api-v3-sdk")).default

    const client = Sib.ApiClient.instance
    client.authentications["api-key"].apiKey = apiKey

    const tranEmailApi = new Sib.TransactionalEmailsApi()

    await tranEmailApi.sendTransacEmail({
      to: [{ email: "support@zazatechnologies.com", name: "Zaza Support" }],
      sender: { email: "no-reply@zazatechnologies.com", name: "Zaza Draft" },
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
        attributes: { FIRSTNAME: name },
        updateEnabled: true,
        listIds: [listId],
      })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error("Contact error", err)
    return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500 })
  }
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }) as any)[c],
  )
}
