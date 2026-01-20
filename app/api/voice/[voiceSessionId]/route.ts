import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

export async function GET(
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

  return NextResponse.json({
    success: true,
    data: {
      voiceSessionId,
      status: data.status,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      transcribedText: data.transcribedText ?? null,
      emotionAnalysis: data.emotionAnalysis ?? null,
      failureReason: data.failureReason ?? null,
    },
  })
}
