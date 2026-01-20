import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { analyzeVoiceEmotion } from "@/lib/voice/emotion"

interface RequestPayload {
  targetTone?: string
  preserveIntent?: boolean
}

export async function POST(
  request: Request,
  { params }: { params: { voiceSessionId: string } },
) {
  const { voiceSessionId } = params
  if (!voiceSessionId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_ID", message: "Missing session identifier." } },
      { status: 400 },
    )
  }

  let payload: RequestPayload = {}
  try {
    payload = (await request.json()) as RequestPayload
  } catch {
    // ignore
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
  const docRef = firestore.collection("voice_sessions").doc(voiceSessionId)
  const snapshot = await docRef.get()
  if (!snapshot.exists) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Session not found." } },
      { status: 404 },
    )
  }

  const data = snapshot.data()
  if (data?.userId !== uid) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "You cannot access this session." } },
      { status: 403 },
    )
  }

  if (data.status !== "completed" || !data.transcribedText) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_READY", message: "Audio is not ready for rewriting yet." },
      },
      { status: 409 },
    )
  }

  const baseUrl = new URL(request.url).origin
  const draftPayload = {
    situation: data.transcribedText,
    tone: payload.targetTone ?? "empathetic",
    language: data.language ?? "en",
    rewrite: false,
  }

  const draftResponse = await fetch(`${baseUrl}/api/draft/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: request.headers.get("authorization")!,
    },
    body: JSON.stringify(draftPayload),
  })

  const draftData = await draftResponse.json()
  if (!draftResponse.ok || !draftData?.success) {
    return NextResponse.json(draftData, { status: draftResponse.status })
  }

  const safeVersion: string = draftData.data?.generatedDraft ?? ""
  const originalEmotion = data.emotionAnalysis
  const rewrittenEmotion = analyzeVoiceEmotion(safeVersion)
  const frustrationChange = originalEmotion
    ? originalEmotion.frustrationScore - rewrittenEmotion.frustrationScore
    : 0

  const emotionReduction = {
    frustrationChange: `${frustrationChange.toFixed(0)} points`,
    professionalImprovement: frustrationChange > 0
      ? "Tone shifted toward calm diplomacy."
      : "Tone remains steady.",
  }

  const keyChanges = [
    `Frustration change: ${frustrationChange.toFixed(0)} points`,
    payload.targetTone ? `Tone target: ${payload.targetTone}` : "Tone aligned with calmer tone.",
    "Checked for professionalism and clarity.",
  ]

  await docRef.set(
    {
      safeRewrite: safeVersion,
    },
    { merge: true },
  )

  return NextResponse.json({
    success: true,
    data: {
      originalText: data.transcribedText,
      safeVersion,
      emotionReduction,
      keyChanges,
    },
  })
}
