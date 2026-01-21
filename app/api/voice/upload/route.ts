import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
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
  | "done"

type VoiceDiagnostics = {
  storageConfigured: boolean
  storageError: string | null
  aiConfigured: boolean
}

function createDiagnostics(overrides: Partial<VoiceDiagnostics> = {}) {
  return {
    storageConfigured: false,
    storageError: null,
    aiConfigured: AUDIO_ENV_VARS.every((env) => Boolean(process.env[env])),
    ...overrides,
  }
}

const jsonHeaders = (requestId: string) => ({
  "content-type": "application/json",
  "x-request-id": requestId,
})

function createErrorResponse({
  code,
  message,
  stage,
  status = 500,
  diagnostics,
  requestId,
  details,
}: {
  code: string
  message: string
  stage: ResponseStage
  status?: number
  diagnostics: VoiceDiagnostics
  requestId: string
  details?: string | Record<string, unknown>
}) {
  const payload: Record<string, unknown> = {
    ok: false,
    requestId,
    stage,
    error: { code, message, details, stage },
    diagnostics,
  }
  console.error(
    `[voice] requestId=${requestId} stage=${stage} status=${status} code=${code} msg=${message}`,
  )
  return NextResponse.json(payload, {
    status,
    headers: jsonHeaders(requestId),
  })
}

function createSuccessResponse({
  voiceSessionId,
  diagnostics,
  requestId,
}: {
  voiceSessionId: string
  diagnostics: VoiceDiagnostics
  requestId: string
}) {
  const payload = {
    ok: true,
    requestId,
    stage: "done" as const,
    data: { voiceSessionId },
    diagnostics,
  }
  return NextResponse.json(payload, {
    status: 200,
    headers: jsonHeaders(requestId),
  })
}

function createMediaPath(sessionId: string, fileName: string) {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `voice_sessions/${sessionId}/${timestamp}-${safeName}`
}

function logStage(requestId: string, stage: ResponseStage, success: boolean, info?: string) {
  const line = `[voice] requestId=${requestId} stage=${stage} ${success ? "ok" : "error"}${
    info ? ` msg=${info}` : ""
  }`
  if (success) {
    console.info(line)
  } else {
    console.error(line)
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID()
  const diagnostics = createDiagnostics()
  try {
    const form = await request.formData()
    const file = form.get("file")
    const language = (form.get("language") as string) ?? "en-GB"
    const sessionId = form.get("sessionId") as string | null

    if (!file || typeof file === "string") {
      return createErrorResponse({
        code: "MISSING_FILE",
        message: "Please attach an audio file.",
        stage: "parse",
        status: 400,
        diagnostics,
        requestId,
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
        requestId,
      })
    }
    logStage(requestId, "parse", true)

    const aiConfigured = AUDIO_ENV_VARS.every((env) => Boolean(process.env[env]))
    if (!aiConfigured) {
      return createErrorResponse({
        code: "AI_NOT_CONFIGURED",
        message: "Voice transcription is not configured.",
        stage: "analysis",
        diagnostics,
        requestId,
        details: { missingEnv: AUDIO_ENV_VARS.filter((env) => !process.env[env]) },
      })
    }
    logStage(requestId, "validate", true)

    let authContext
    try {
      authContext = await authorizeFirebaseRequest(request)
    } catch (error) {
      const status =
        error instanceof Error && error.name === "FirebaseAuthorizationError" ? 401 : 401
      return createErrorResponse({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        stage: "auth",
        status,
        diagnostics,
        requestId,
      })
    }
    logStage(requestId, "auth", true)

    const { uid, firestore, storage } = authContext
    if (!firestore) {
      return createErrorResponse({
        code: "FIRESTORE_UNAVAILABLE",
        message: "Unable to access Firestore.",
        stage: "storage",
        status: 500,
        diagnostics,
        requestId,
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
          requestId,
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
        logStage(requestId, "storage", true)
      } catch (storageError) {
        storageDiagnostics.storageConfigured = false
        storageDiagnostics.storageError =
          storageError instanceof Error ? storageError.message : "Storage upload failed"
        diagnostics.storageError = storageDiagnostics.storageError
        await sessionRef.set(
          {
            status: "failed",
            failureReason: storageDiagnostics.storageError,
          },
          { merge: true },
        )
        logStage(requestId, "storage", false, storageDiagnostics.storageError)
        return createErrorResponse({
          code: "STORAGE_UPLOAD_FAILED",
          message: storageDiagnostics.storageError,
          stage: "storage",
          status: 500,
          diagnostics,
          requestId,
        })
      }
    } else {
      storageDiagnostics.storageError = bucketName
        ? "Firebase storage client unavailable"
        : "FIREBASE_STORAGE_BUCKET is not set"
      diagnostics.storageError = storageDiagnostics.storageError
    }

    diagnostics.storageConfigured = storageDiagnostics.storageConfigured
    diagnostics.storageError = storageDiagnostics.storageError
    diagnostics.aiConfigured = aiConfigured

    try {
      const transcribedText = await transcribeAudio(buffer, file.type || "audio/mpeg", language)
      const emotionAnalysis = analyzeVoiceEmotion(transcribedText)
      logStage(requestId, "analysis", true)

      await sessionRef.set(
        {
          transcribedText,
          emotionAnalysis,
          status: "completed",
        },
        { merge: true },
      )

      logStage(requestId, "done", true)
      return createSuccessResponse({
        voiceSessionId: sessionRef.id,
        diagnostics,
        requestId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing error"
      await sessionRef.set(
        {
          status: "failed",
          failureReason: message,
        },
        { merge: true },
      )
      logStage(requestId, "analysis", false, message)
      return createErrorResponse({
        code: "VOICE_TRANSCRIBE_FAILED",
        message,
        stage: "analysis",
        diagnostics,
        requestId,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    logStage(requestId, "unknown", false, message)
    return createErrorResponse({
      code: "UNEXPECTED_ERROR",
      message,
      stage: "unknown",
      status: 500,
      diagnostics,
      requestId,
    })
  }
}
