import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

interface RequestPayload {
  tone?: string
  language?: string
}

export async function POST(
  request: Request,
  { params }: { params: { scanId: string } },
) {
  const { scanId } = params
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

  if (data.status !== "completed" || !data.extractedText) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_READY", message: "Scan is not ready for a rewrite yet." },
      },
      { status: 409 },
    )
  }

  const baseUrl = new URL(request.url).origin
  const draftPayload = {
    situation: data.extractedText,
    tone: payload.tone ?? "professional",
    language: payload.language ?? "en",
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
