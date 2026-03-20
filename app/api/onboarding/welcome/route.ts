import "server-only"

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { ensureUserDocument } from "@/lib/account-bootstrap"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function unauthorizedResponse(error: unknown) {
  const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: (error as Error).message || "Unauthorized",
      },
    },
    { status },
  )
}

function firestoreUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FIRESTORE_UNAVAILABLE",
        message: "Unable to access Firestore.",
      },
    },
    { status: 500 },
  )
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      (({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }) as Record<string, string>)[character],
  )
}

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return unauthorizedResponse(error)
  }

  const { uid, firestore, decodedToken } = authContext
  if (!firestore) {
    return firestoreUnavailableResponse()
  }

  try {
    await ensureUserDocument(firestore, uid, {
      email: decodedToken.email ?? null,
      displayName: decodedToken.name ?? null,
    })

    const userRef = firestore.collection("users").doc(uid)
    const userSnapshot = await userRef.get()
    const userData = userSnapshot.data() ?? {}
    const email =
      typeof userData.email === "string" && userData.email.trim()
        ? userData.email.trim()
        : decodedToken.email?.trim() ?? ""
    const displayName =
      typeof userData.displayName === "string" && userData.displayName.trim()
        ? userData.displayName.trim()
        : decodedToken.name?.trim() ?? ""

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_REQUIRED",
            message: "A verified email address is required to send the welcome email.",
          },
        },
        { status: 400 },
      )
    }

    if (userData.welcomeEmailSent === true) {
      console.info("[onboarding] welcome email already sent", { uid, email })
      return NextResponse.json({
        success: true,
        data: {
          sent: false,
          alreadySent: true,
        },
      })
    }

    const apiKey = process.env.BREVO_API_KEY?.trim()
    const senderEmail = process.env.BREVO_FROM_EMAIL?.trim()
    if (!apiKey || !senderEmail) {
      console.error("[onboarding] Missing Brevo welcome email config", {
        uid,
        missingApiKey: !apiKey,
        missingSenderEmail: !senderEmail,
      })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "WELCOME_EMAIL_NOT_CONFIGURED",
            message: "Welcome email service is not configured.",
          },
        },
        { status: 500 },
      )
    }

    const safeDisplayName = displayName || email.split("@")[0]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.zazadraft.com"
    const htmlContent = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #10233f; line-height: 1.5;">
        <h1 style="margin-bottom: 12px;">Welcome to Zaza Draft</h1>
        <p style="margin: 0 0 12px;">Hi ${escapeHtml(safeDisplayName)},</p>
        <p style="margin: 0 0 12px;">
          Your Zaza Draft account is ready. You can use Safe Draft for parent communication,
          Panic Scan for urgent screenshots, and report comments for clear school reporting.
        </p>
        <p style="margin: 0 0 12px;">
          Sign in any time at <a href="${appUrl}" style="color: #2563eb;">${appUrl}</a>.
        </p>
        <p style="margin: 0;">Best regards,<br />The Zaza Draft team</p>
      </div>
    `

    console.info("[onboarding] welcome email trigger", { uid, email })

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        to: [{ email, name: safeDisplayName }],
        sender: { email: senderEmail, name: "Zaza Draft" },
        subject: "Welcome to Zaza Draft",
        htmlContent,
        headers: {
          "X-Zaza-Source": "app-onboarding",
          "X-Zaza-User": uid,
        },
        params: {
          uid,
          source: "app-onboarding",
        },
      }),
    })

    if (!emailResponse.ok) {
      const bodyText = await emailResponse.text().catch(() => "")
      console.error("[onboarding] welcome email send failed", {
        uid,
        status: emailResponse.status,
        body: bodyText,
      })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "WELCOME_EMAIL_FAILED",
            message: "Unable to send the welcome email.",
          },
        },
        { status: 502 },
      )
    }

    await userRef.set(
      {
        welcomeEmailSent: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    console.info("[onboarding] welcome email sent", { uid, email })

    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        alreadySent: false,
      },
    })
  } catch (error) {
    console.error("[onboarding] welcome email route failed", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "WELCOME_EMAIL_FAILED",
          message: "Unable to process the welcome email.",
        },
      },
      { status: 500 },
    )
  }
}
