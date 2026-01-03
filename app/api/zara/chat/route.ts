import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"

const REPLY_TEMPLATES: Record<string, string> = {
  "de-DE": "Ich bin hier, um zu helfen! Während ich lerne, probiere die Tipps oben aus oder beschreibe deine Situation im Haupteditor.",
  "en-GB": "I'm here to help! While I'm still learning, try the quick tips above or describe your situation in the main editor for AI-generated drafts.",
  "en-US": "I'm here to help! While I'm still learning, try the quick tips above or describe your situation in the main editor for AI-generated drafts.",
}

const DEFAULT_REPLY =
  "I'm here to help! While I'm still learning, try the quick tips above or describe your situation in the main editor for AI-generated drafts."

interface ZaraChatRequest {
  message?: string
  uiLocale?: string
}

export const runtime = "nodejs"

export async function POST(request: Request) {
  const requestId = randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    const payload = {
      success: false,
      error: {
        code: "auth_required",
        message: (error as Error).message || "Authentication required",
        status,
        requestId,
      },
    }
    console.error("[zara] chat auth failed", {
      requestId,
      status,
      message: payload.error.message,
    })
    return NextResponse.json(payload, { status })
  }

  const body: ZaraChatRequest = await request.json().catch(() => ({}))
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    const status = 400
    console.warn("[zara] chat invalid input", {
      requestId,
      status,
    })
    const payload = {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Please provide a message before sending.",
        status,
        requestId,
      },
    }
    return NextResponse.json(payload, { status })
  }

  const locale = body.uiLocale ?? "en-GB"
  const reply = REPLY_TEMPLATES[locale] ?? DEFAULT_REPLY
  console.info("[zara] chat success", {
    requestId,
    uid: authContext?.uid ?? "unknown",
    locale,
  })

  return NextResponse.json({
    success: true,
    data: {
      reply,
    },
    meta: {
      requestId,
    },
  })
}

export function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST to talk to Zara.",
      },
    },
    { status: 405 },
  )
}

