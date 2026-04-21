import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { generateZaraReply } from "@/lib/ai/zara"
import { OPENAI_BUSY_MESSAGE, isOpenAIBusyError } from "@/lib/ai/openai-retry"

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
    const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
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
  try {
    const reply = await generateZaraReply(message, locale)
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
  } catch (error) {
    const busyError = isOpenAIBusyError(error)
    const status = busyError
      ? 503
      : error instanceof Error && error.message.includes("Missing")
        ? 500
        : 502
    console.error("[zara] chat error", {
      requestId,
      uid: authContext?.uid ?? "unknown",
      locale,
      error,
    })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AI_ERROR",
          message: busyError
            ? OPENAI_BUSY_MESSAGE
            : error instanceof Error
              ? error.message
              : "Unable to call AI",
          status,
          requestId,
        },
      },
      { status },
    )
  }
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
