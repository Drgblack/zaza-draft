import { NextResponse } from "next/server"
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

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status =
      error instanceof FirebaseAuthorizationError ? error.statusCode : 401
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

  const body: ZaraChatRequest = await request.json().catch(() => ({}))
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Please provide a message before sending.",
        },
      },
      { status: 400 },
    )
  }

  const reply = REPLY_TEMPLATES[body.uiLocale ?? ""] ?? DEFAULT_REPLY
  return NextResponse.json({
    success: true,
    data: {
      reply,
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
