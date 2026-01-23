import { NextResponse, type NextRequest } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import type { LanguageKey } from "@/lib/draft/fallback"
import { isDebugEnabled } from "@/lib/debug"
import {
  resolveGreeting,
  type GreetingDecision,
  logGreetingDecision,
} from "@/lib/draft/greeting-resolution"

interface RequestPayload {
  tone?: string
  language?: string
}

function extractScanId(request: Request | NextRequest) {
  const url = new URL(request.url)
  const segments = url.pathname.split("/").filter(Boolean)
  return segments[segments.length - 2] ?? ""
}

export async function POST(request: NextRequest) {
  const scanId = extractScanId(request)
  if (!scanId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_ID", message: "Missing scan identifier." } },
      { status: 400 },
    )
  }

  let payload: RequestPayload = {}
  try {
    payload = (await request.json()) as RequestPayload
  } catch {
    // ignore, optional payload
  }

  if (!request.headers.get("authorization")) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization." } },
      { status: 401 },
    )
  }

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    )
  }

  const { uid, firestore } = authContext
  if (!firestore) {
    return NextResponse.json(
      { success: false, error: { code: "FIRESTORE_UNAVAILABLE", message: "Unable to access Firestore." } },
      { status: 500 },
    )
  }
  const docRef = firestore.collection("panic_scans").doc(scanId)
  const snapshot = await docRef.get()
  if (!snapshot.exists) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Scan not found." } },
      { status: 404 },
    )
  }

  const data = snapshot.data()
  if (data?.userId !== uid) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "You cannot access this scan." } },
      { status: 403 },
    )
  }

  if (data.status !== "completed" || (!data.extractedTextClean && !data.extractedText)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_READY", message: "Scan is not ready for a rewrite yet." },
      },
      { status: 409 },
    )
  }

  const requestUrl = new URL(request.url)
  const baseUrl = requestUrl.origin
  const situation = data.extractedTextClean ?? data.extractedText
  const resolvedDraftLanguage: LanguageKey = payload.language === "de" ? "de" : "en"
  const greetingResult = resolveGreeting({
    cleanedOcrText: situation,
    locale: resolvedDraftLanguage,
    messageType: data?.classification?.messageType ?? null,
  })
  const normalizedGreeting = greetingResult.greeting.trim()
  const hasSafeConfidence =
    greetingResult.confidence === "MEDIUM" || greetingResult.confidence === "HIGH"
  const greetingDidResolveName = greetingResult.source === "resolved-name"
  let greetingFinal =
    hasSafeConfidence && greetingDidResolveName && normalizedGreeting.length > 0
  const debugEnabled =
    isDebugEnabled(requestUrl.searchParams) || request.headers.get("x-debug") === "1"
  if (hasSafeConfidence && greetingDidResolveName && normalizedGreeting.length === 0 && debugEnabled) {
    console.debug("[panic-scan] resolved name confidence high, but greeting text is empty; forcing fallback", {
      scanId,
    })
  }
  if (!normalizedGreeting) {
    greetingFinal = false
  }
  const greetingDecision: GreetingDecision = {
    greeting: normalizedGreeting || greetingResult.greeting,
    safeParentName: greetingResult.safeName ?? null,
    confidence: greetingResult.confidence,
    source: greetingResult.source,
    locale: resolvedDraftLanguage,
    messageType: data?.classification?.messageType ?? undefined,
    scanId,
    greetingFinal,
  }
  if (debugEnabled) {
    logGreetingDecision("panic-scan", greetingDecision, requestUrl.searchParams)
  }
  const draftPayload = {
    situation,
    tone: payload.tone ?? "professional",
    language: resolvedDraftLanguage,
    messageType: data?.classification?.messageType ?? null,
    scanId,
    greeting: {
      text: normalizedGreeting || greetingResult.greeting,
      name: greetingResult.safeName,
    },
    greetingFinal,
    greetingConfidence: greetingResult.confidence,
    greetingSource: greetingResult.source,
  }

  const draftResponse = await fetch(`${baseUrl}/api/draft/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: request.headers.get("authorization")!,
    },
    body: JSON.stringify(draftPayload),
  })

  const dataResponse = await draftResponse.json()
  return NextResponse.json(dataResponse, { status: draftResponse.status })
}
