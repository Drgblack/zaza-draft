import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit, RateLimitError } from "@/lib/rate-limit"
import { analyzeVoiceEmotion } from "@/lib/voice/emotion"
import { transcribeAudio } from "@/lib/voice/transcribe"

const MAX_AUDIO_BYTES = 8 * 1024 * 1024
const AUDIO_TTL_MS = 1 * 60 * 60 * 1000

function createMediaPath(sessionId: string, fileName: string) {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `voice_sessions/${sessionId}/${timestamp}-${safeName}`
}

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get("file")
  const language = (form.get("language") as string) ?? "en-GB"
  const sessionId = form.get("sessionId") as string | null

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_FILE", message: "Please attach an audio file." } },
      { status: 400 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FILE_TOO_LARGE", message: "Audio must be under 8MB." },
      },
      { status: 413 },
    )
  }

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    )
  }

  const { uid, firestore, storage } = authContext
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FIRESTORE_UNAVAILABLE", message: "Unable to access Firestore." },
      },
      { status: 500 },
    )
  }
  if (!storage) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "STORAGE_UNAVAILABLE", message: "Storage bucket not configured." },
      },
      { status: 500 },
    )
  }

  try {
    await enforcePerUserRateLimit(uid, firestore, { docName: "voiceUpload" })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Try again in ${Math.ceil(error.retryAfterMs / 1000)} seconds.`,
          },
        },
        { status: 429 },
      )
    }
    console.error("[voice] Rate limit check failed", error)
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "STORAGE_BUCKET_MISSING", message: "Storage bucket is not configured." },
      },
      { status: 500 },
    )
  }

  const sessionRef = firestore.collection("voice_sessions").doc()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + AUDIO_TTL_MS)
  const doc = {
    voiceSessionId: sessionRef.id,
    userId: uid,
    fileName: file.name,
    language,
    mediaPath: createMediaPath(sessionRef.id, file.name),
    status: "processing",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId: sessionId ?? undefined,
  }

  await sessionRef.set(doc)

  try {
    const bucket = storage.bucket(bucketName)
    await bucket.file(doc.mediaPath).save(buffer, { metadata: { contentType: file.type || "audio/mpeg" } })

    const transcribedText = await transcribeAudio(buffer, file.type || "audio/mpeg", language)
    const emotionAnalysis = analyzeVoiceEmotion(transcribedText)

    await sessionRef.set(
      {
        transcribedText,
        emotionAnalysis,
        status: "completed",
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[voice] processing failed", error)
    await sessionRef.set(
      {
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Processing error",
      },
      { merge: true },
    )
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROCESSING_FAILED", message: "Unable to transcribe audio right now." },
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      voiceSessionId: sessionRef.id,
      status: "completed",
    },
  })
}
