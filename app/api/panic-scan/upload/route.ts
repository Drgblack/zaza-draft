import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit, RateLimitError } from "@/lib/rate-limit"
import { analyzePanicMessage } from "@/lib/panic-scan/analysis"
import { cleanOcrText } from "@/lib/panic-scan/clean-ocr"
import { performVisionOcr } from "@/lib/panic-scan/ocr"
import type { PanicScanDocument } from "@/lib/panic-scan/types"

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const SCAN_TTL_MS = 24 * 60 * 60 * 1000

type ResponseStage =
  | "auth"
  | "parse"
  | "validate"
  | "ocr"
  | "analysis"
  | "storage"
  | "rate_limit"
  | "unknown"

function createDiagnostics(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    storageConfigured: false,
    storageError: null,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    ocrPerformed: false,
    ocrSucceeded: false,
    analysisSucceeded: false,
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
  details?: string | null
}) {
  const errorPayload: Record<string, unknown> = { code, message, stage }
  if (details) {
    errorPayload.details = details
  }
  console.error(`[panic-scan] stage=${stage} code=${code} message=${message}`)
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
  scanId,
  diagnostics,
}: {
  scanId: string
  diagnostics: ReturnType<typeof createDiagnostics>
}) {
  return NextResponse.json({
    ok: true,
    data: {
      scanId,
    },
    diagnostics,
  })
}

function createMediaPath(scanId: string, fileName: string) {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `panic_scans/${scanId}/${timestamp}-${safeName}`
}

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get("file")
  const platform = (form.get("platform") as string) ?? "web"
  const sessionId = form.get("sessionId") as string | null
  const diagnostics = createDiagnostics()

  if (!file || typeof file === "string") {
    return createErrorResponse({
      code: "MISSING_FILE",
      message: "Please attach an image.",
      stage: "parse",
      status: 400,
      diagnostics,
    })
  }

  if (!["web", "mobile_ios", "mobile_android"].includes(platform)) {
    return createErrorResponse({
      code: "INVALID_PLATFORM",
      message: "Unsupported platform.",
      stage: "validate",
      status: 400,
      diagnostics,
    })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return createErrorResponse({
      code: "FILE_TOO_LARGE",
      message: `Image must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`,
      stage: "validate",
      status: 413,
      diagnostics,
    })
  }

  if (!file.type?.startsWith("image/")) {
    return createErrorResponse({
      code: "INVALID_FORMAT",
      message: "Only image uploads are supported.",
      stage: "validate",
      status: 415,
      diagnostics,
    })
  }

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
    await enforcePerUserRateLimit(uid, firestore, { docName: "panicScanUpload" })
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
    console.error("[panic-scan] Rate limit check failed", error)
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  const scanRef = firestore.collection("panic_scans").doc()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + SCAN_TTL_MS)
  const doc: PanicScanDocument = {
    scanId: scanRef.id,
    userId: uid,
    fileName: file.name,
    platform,
    mediaPath: createMediaPath(scanRef.id, file.name),
    status: "processing",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId: sessionId ?? undefined,
  }

  const storageDiagnostics = {
    storageConfigured: false,
    storageError: null as string | null,
  }
  if (storage && bucketName) {
    try {
      const bucket = storage.bucket(bucketName)
      await bucket
        .file(doc.mediaPath)
        .save(buffer, { metadata: { contentType: file.type || "application/octet-stream" } })
      storageDiagnostics.storageConfigured = true
    } catch (uploadError) {
      storageDiagnostics.storageConfigured = false
      storageDiagnostics.storageError =
        uploadError instanceof Error
          ? uploadError.message
          : "Storage upload failed"
      console.error(
        `[panic-scan] storage disabled: ${storageDiagnostics.storageError} (${bucketName})`,
      )
    }
  } else if (bucketName) {
    storageDiagnostics.storageError = "Firebase storage client unavailable"
  } else {
    storageDiagnostics.storageError = "FIREBASE_STORAGE_BUCKET is not set"
  }

  await scanRef.set(doc)

  const diagWithStorage = createDiagnostics({
    storageConfigured: storageDiagnostics.storageConfigured,
    storageError: storageDiagnostics.storageError,
  })

  if (!process.env.OPENAI_API_KEY) {
    const message = "Missing OPENAI_API_KEY"
    await scanRef.set(
      {
        status: "failed",
        failureReason: message,
      },
      { merge: true },
    )
    return createErrorResponse({
      code: "AI_NOT_CONFIGURED",
      message,
      stage: "analysis",
      diagnostics: diagWithStorage,
    })
  }

  try {
    diagWithStorage.ocrPerformed = true
    const extractedText = await performVisionOcr(buffer)
    diagWithStorage.ocrSucceeded = true
    const cleaned = cleanOcrText(extractedText)

    const analysis = await analyzePanicMessage(extractedText)
    diagWithStorage.analysisSucceeded = true
    const processingTimeMs = Date.now() - createdAt.getTime()

    await scanRef.set(
      {
        extractedText,
        extractedTextClean: cleaned.cleanText,
        cleanConfidence: cleaned.confidence,
        classification: analysis.classification,
        analysis: analysis.analysis,
        processingTimeMs,
        status: "completed",
      },
      { merge: true },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing error"
    await scanRef.set(
      {
        status: "failed",
        failureReason: message.slice(0, 1024),
      },
      { merge: true },
    )
    return createErrorResponse({
      code: "PROCESSING_FAILED",
      message,
      stage: "analysis",
      diagnostics: diagWithStorage,
    })
  }

  return createSuccessResponse({
    scanId: scanRef.id,
    diagnostics: diagWithStorage,
  })
}
