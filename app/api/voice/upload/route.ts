import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit, RateLimitError } from "@/lib/rate-limit"
import { analyzeVoiceEmotion } from "@/lib/voice/emotion"
import { transcribeAudio } from "@/lib/voice/transcribe"

const MAX_AUDIO_BYTES = 8 * 1024 * 1024
const AUDIO_TTL_MS = 1 * 60 * 60 * 1000

const AUDIO_ENV_VARS = ["GOOGLE_SPEECH_TO_TEXT_API_KEY"]

type ResponseStage =
  | "auth"
  | "parse"
  | "validate"
  | "analysis"
  | "storage"
  | "rate_limit"
  | "unknown"

function createDiagnostics(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    storageConfigured: false,
    storageError: null,
    aiConfigured: AUDIO_ENV_VARS.every((env) => Boolean(process.env[env])),
    ...overrides,
  }
}

function createErrorResponse({
  code,
  message,
  stage,
  status = 500,
  diagnostics,
  details,
}: {
  code: string
  message: string
  stage: ResponseStage
  status?: number
  diagnostics: ReturnType<typeof createDiagnostics>
  details?: string | Record<string, unknown>
}) {
  const errorPayload: Record<string, unknown> = { code, message, stage }
  if (details) {
    errorPayload.details = details
  }
  console.error(`[voice] stage=${stage} code=${code} message=${message}`)
  return NextResponse.json(
    {
      ok: false,
      error: errorPayload,
      diagnostics,
    },
    { status },
  )
}

function createSuccessResponse({
  voiceSessionId,
  diagnostics,
}: {
  voiceSessionId: string
  diagnostics: ReturnType<typeof createDiagnostics>
}) {
  return NextResponse.json({
    ok: true,
    data: {
      voiceSessionId,
    },
    diagnostics,
  })
}

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
  const diagnostics = createDiagnostics()

  if (!file || typeof file === "string") {
    return createErrorResponse({
      code: "MISSING_FILE",
      message: "Please attach an audio file.",
      stage: "parse",
      status: 400,
      diagnostics,
    })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length === 0 || buffer.length > MAX_AUDIO_BYTES) {
    return createErrorResponse({
      code: "FILE_TOO_LARGE",
      message: `Audio must be under ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))}MB.`,
      stage: "validate",
      status: 413,
      diagnostics,
    })
  }

  const aiConfigured = AUDIO_ENV_VARS.every((env) => Boolean(process.env[env]))
  if (!aiConfigured) {
    return createErrorResponse({
      code: "AI_NOT_CONFIGURED",
      message: "Voice transcription is not configured.",
      stage: "analysis",
      diagnostics,
      details: { missingEnv: AUDIO_ENV_VARS.filter((env) => !process.env[env]) },
    })
  }

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    return createErrorResponse({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
      stage: "auth",
      status: 401,
      diagnostics,
    })
  }

  const { uid, firestore, storage } = authContext
  if (!firestore) {
    return createErrorResponse({
      code: "FIRESTORE_UNAVAILABLE",
      message: "Unable to access Firestore.",
      stage: "storage",
      status: 500,
      diagnostics,
    })
  }

  try {
    await enforcePerUserRateLimit(uid, firestore, { docName: "voiceUpload" })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return createErrorResponse({
        code: "RATE_LIMIT",
        message: `Try again in ${Math.ceil(error.retryAfterMs / 1000)} seconds.`,
        stage: "rate_limit",
        status: 429,
        diagnostics,
      })
    }
    console.error("[voice] Rate limit check failed", error)
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  const storageDiagnostics = {
    storageConfigured: false,
    storageError: null as string | null,
  }

  const sessionRef = firestore.collection("voice_sessions").doc()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + AUDIO_TTL_MS)
  const mediaPath = createMediaPath(sessionRef.id, file.name)
  const doc = {
    voiceSessionId: sessionRef.id,
    userId: uid,
    fileName: file.name,
    language,
    mediaPath,
    status: "processing",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId: sessionId ?? undefined,
  }

  await sessionRef.set(doc)

  if (storage && bucketName) {
    try {
      const bucket = storage.bucket(bucketName)
      await bucket.file(mediaPath).save(buffer, { metadata: { contentType: file.type || "audio/mpeg" } })
      storageDiagnostics.storageConfigured = true
    } catch (storageError) {
      storageDiagnostics.storageConfigured = false
      storageDiagnostics.storageError =
        storageError instanceof Error ? storageError.message : "Storage upload failed"
      console.error(
        `[voice] storage disabled: ${storageDiagnostics.storageError} (${bucketName})`,
      )
    }
  } else {
    storageDiagnostics.storageError = bucketName
      ? "Firebase storage client unavailable"
      : "FIREBASE_STORAGE_BUCKET is not set"
  }

  const diagWithStorage = createDiagnostics({
    storageConfigured: storageDiagnostics.storageConfigured,
    storageError: storageDiagnostics.storageError,
  })

  try {
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
    const message = error instanceof Error ? error.message : "Processing error"
    await sessionRef.set(
      {
        status: "failed",
        failureReason: message,
      },
      { merge: true },
    )
    return createErrorResponse({
      code: "VOICE_TRANSCRIBE_FAILED",
      message,
      stage: "analysis",
      diagnostics: diagWithStorage,
    })
  }

  diagWithStorage.aiConfigured = true

  return createSuccessResponse({
    voiceSessionId: sessionRef.id,
    diagnostics: diagWithStorage,
  })
}
