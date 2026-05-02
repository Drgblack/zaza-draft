import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit, RateLimitError } from "@/lib/rate-limit"
import { analyzePanicMessage, buildHeuristicPanicAnalysis } from "@/lib/panic-scan/analysis"
import {
  OPENAI_BUSY_MESSAGE,
  OpenAIRequestError,
  isOpenAIBusyError,
} from "@/lib/ai/openai-retry"
import { cleanOcrText } from "@/lib/panic-scan/clean-ocr"
import { canonicalizeLocaleIdentifier } from "@/lib/draft/language"
import { resolvePanicScanLocale } from "@/lib/panic-scan/locale"
import { filterVisionOcrForeground } from "@/lib/panic-scan/filter-vision-ocr"
import { sanitizeEmailText } from "@/lib/text/email-sanitizer"
import { performVisionOcr } from "@/lib/panic-scan/ocr"
import type { PanicScanDocument } from "@/lib/panic-scan/types"
import type { OpenAICallInstrumentation } from "@/lib/ai/client"

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const SCAN_TTL_MS = 24 * 60 * 60 * 1000

const SUSPICIOUS_PATH_PATTERNS = [/^[A-Za-z]:[\\/]/, /^file:\/\//i]

function isSuspiciousClientPath(value: string) {
  return SUSPICIOUS_PATH_PATTERNS.some((pattern) => pattern.test(value))
}

type ResponseStage =
  | "auth"
  | "parse"
  | "validate"
  | "ocr"
  | "analysis"
  | "storage"
  | "rate_limit"
  | "unknown"
  | "done"

type PanicScanDiagnostics = {
  storageConfigured: boolean
  storageError: string | null
  aiConfigured: boolean
  ocrConfigured: boolean
  ocrPerformed: boolean
  ocrSucceeded: boolean
  analysisSucceeded: boolean
}

function createDiagnostics(overrides: Partial<PanicScanDiagnostics> = {}) {
  return {
    storageConfigured: false,
    storageError: null,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    ocrConfigured: Boolean(process.env.GOOGLE_VISION_API_KEY),
    ocrPerformed: false,
    ocrSucceeded: false,
    analysisSucceeded: false,
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
  diagnostics: PanicScanDiagnostics
  requestId: string
  details?: string | null
}) {
  const payload: Record<string, unknown> = {
    ok: false,
    requestId,
    stage,
    error: { code, message, details, stage },
    diagnostics,
  }
  console.error(
    `[panic-scan] requestId=${requestId} stage=${stage} status=${status} code=${code} msg=${message}`,
  )
  return NextResponse.json(payload, {
    status,
    headers: jsonHeaders(requestId),
  })
}

function createSuccessResponse({
  scanId,
  diagnostics,
  requestId,
}: {
  scanId: string
  diagnostics: PanicScanDiagnostics
  requestId: string
}) {
  const payload = {
    ok: true,
    requestId,
    stage: "done" as const,
    data: { scanId },
    diagnostics,
  }
  return NextResponse.json(payload, {
    status: 200,
    headers: jsonHeaders(requestId),
  })
}

function logStage(requestId: string, stage: ResponseStage, success: boolean, info?: string) {
  const line = `[panic-scan] requestId=${requestId} stage=${stage} ${success ? "ok" : "error"}${
    info ? ` msg=${info}` : ""
  }`
  if (success) {
    console.info(line)
  } else {
    console.error(line)
  }
}

function createMediaPath(scanId: string, fileName: string) {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `panic_scans/${scanId}/${timestamp}-${safeName}`
}

function approxTokensFromText(text: string) {
  return Math.ceil(text.length / 4)
}

function classifyFilePayloadSize(bytes: number | null) {
  if (bytes == null) {
    return "unknown"
  }
  if (bytes < 128 * 1024) {
    return "small"
  }
  if (bytes < 1024 * 1024) {
    return "medium"
  }
  return "large"
}

function classifyTextPayloadSize(approxTokens: number) {
  if (approxTokens < 400) {
    return "light"
  }
  if (approxTokens < 1200) {
    return "medium"
  }
  return "heavy"
}

function logPanicScanStructured(event: string, data: Record<string, unknown>) {
  console.info(`[panic-scan][${event}]`, data)
}

export async function POST(request: Request) {
  const requestId = randomUUID()
  const diagnostics = createDiagnostics()
  const attemptStartedAt = Date.now()
  try {
    const form = await request.formData()
    const file = form.get("file")
    const platform = (form.get("platform") as string) ?? "web"
    const sessionId = form.get("sessionId") as string | null
    const uploadAttemptId =
      ((form.get("uploadAttemptId") as string | null) ?? "").trim() || requestId
    const rawUiLocale = form.get("uiLocale") as string | null
    const uiLocale = canonicalizeLocaleIdentifier(rawUiLocale)
    const fileName = typeof file === "string" || !file ? null : file.name
    const fileType = typeof file === "string" || !file ? null : file.type
    const fileSizeBytes = typeof file === "string" || !file ? null : file.size
    let openAiCallCount = 0
    let openAiRetryTriggered = false

    const finalizeAttempt = (status: "ok" | "error", extra: Record<string, unknown> = {}) => {
      logPanicScanStructured("attempt_end", {
        requestId,
        uploadAttemptId,
        sessionId,
        status,
        elapsedMs: Date.now() - attemptStartedAt,
        openAiCallCount,
        openAiRetryTriggered,
        ...extra,
      })
    }

    logPanicScanStructured("attempt_start", {
      requestId,
      uploadAttemptId,
      sessionId,
      platform,
      uiLocale,
      fileName,
      fileType,
      fileSizeBytes,
      fileSizeClass: classifyFilePayloadSize(fileSizeBytes),
    })

    if (typeof file === "string" && isSuspiciousClientPath(file)) {
      finalizeAttempt("error", { stage: "parse", code: "INVALID_FILE_PATH" })
      return createErrorResponse({
        code: "INVALID_FILE_PATH",
        message: "Upload the screenshot directly instead of providing a local path.",
        stage: "parse",
        status: 400,
        diagnostics,
        requestId,
      })
    }

    if (!file || typeof file === "string") {
      finalizeAttempt("error", { stage: "parse", code: "MISSING_FILE" })
      return createErrorResponse({
        code: "MISSING_FILE",
        message: "Please attach an image.",
        stage: "parse",
        status: 400,
        diagnostics,
        requestId,
      })
    }

    if (!["web", "mobile_ios", "mobile_android"].includes(platform)) {
      finalizeAttempt("error", { stage: "validate", code: "INVALID_PLATFORM" })
      return createErrorResponse({
        code: "INVALID_PLATFORM",
        message: "Unsupported platform.",
        stage: "validate",
        status: 400,
        diagnostics,
        requestId,
      })
    }
    logStage(requestId, "validate", true)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE_BYTES) {
      finalizeAttempt("error", { stage: "validate", code: "FILE_TOO_LARGE" })
      return createErrorResponse({
        code: "FILE_TOO_LARGE",
        message: `Image must be under ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`,
        stage: "validate",
        status: 413,
        diagnostics,
        requestId,
      })
    }

    if (!file.type?.startsWith("image/")) {
      finalizeAttempt("error", { stage: "validate", code: "INVALID_FORMAT" })
      return createErrorResponse({
        code: "INVALID_FORMAT",
        message: "Only image uploads are supported.",
        stage: "validate",
        status: 415,
        diagnostics,
        requestId,
      })
    }
    logStage(requestId, "parse", true)

    let authContext
    const authStartedAt = Date.now()
    try {
      authContext = await authorizeFirebaseRequest(request)
    } catch (error) {
      const status =
        error instanceof Error && error.name === "FirebaseAuthorizationError" ? 401 : 401
      logPanicScanStructured("step", {
        requestId,
        uploadAttemptId,
        step: "auth",
        status: "error",
        elapsedMs: Date.now() - authStartedAt,
      })
      finalizeAttempt("error", { stage: "auth", code: "UNAUTHORIZED" })
      return createErrorResponse({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        stage: "auth",
        status,
        diagnostics,
        requestId,
      })
    }
    logPanicScanStructured("step", {
      requestId,
      uploadAttemptId,
      step: "auth",
      status: "ok",
      elapsedMs: Date.now() - authStartedAt,
    })
    logStage(requestId, "auth", true)

    const { uid, firestore, storage } = authContext
    if (!firestore) {
      finalizeAttempt("error", { stage: "storage", code: "FIRESTORE_UNAVAILABLE" })
      return createErrorResponse({
        code: "FIRESTORE_UNAVAILABLE",
        message: "Unable to access Firestore.",
        stage: "storage",
        status: 500,
        diagnostics,
        requestId,
      })
    }

    const rateLimitStartedAt = Date.now()
    try {
      await enforcePerUserRateLimit(uid, firestore, { docName: "panicScanUpload" })
    } catch (error) {
      if (error instanceof RateLimitError) {
        logPanicScanStructured("step", {
          requestId,
          uploadAttemptId,
          step: "rate_limit.check",
          status: "error",
          elapsedMs: Date.now() - rateLimitStartedAt,
        })
        finalizeAttempt("error", { stage: "rate_limit", code: "RATE_LIMIT" })
        return createErrorResponse({
          code: "RATE_LIMIT",
          message: `Try again in ${Math.ceil(error.retryAfterMs / 1000)} seconds.`,
          stage: "rate_limit",
          status: 429,
          diagnostics,
          requestId,
        })
      }
      console.error("[panic-scan] Rate limit check failed", error)
    }
    logPanicScanStructured("step", {
      requestId,
      uploadAttemptId,
      step: "rate_limit.check",
      status: "ok",
      elapsedMs: Date.now() - rateLimitStartedAt,
    })

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
      uiLocale: uiLocale ?? undefined,
    }

    const storageDiagnostics = {
      storageConfigured: false,
      storageError: null as string | null,
    }
    if (storage && bucketName) {
      const storageStartedAt = Date.now()
      try {
        const bucket = storage.bucket(bucketName)
        await bucket
          .file(doc.mediaPath)
          .save(buffer, { metadata: { contentType: file.type || "application/octet-stream" } })
        storageDiagnostics.storageConfigured = true
        logPanicScanStructured("step", {
          requestId,
          uploadAttemptId,
          step: "storage.upload",
          status: "ok",
          elapsedMs: Date.now() - storageStartedAt,
          mediaPath: doc.mediaPath,
        })
        logStage(requestId, "storage", true)
      } catch (uploadError) {
        storageDiagnostics.storageConfigured = false
        storageDiagnostics.storageError =
          uploadError instanceof Error ? uploadError.message : "Storage upload failed"
        diagnostics.storageError = storageDiagnostics.storageError
        await scanRef.set(
          {
            status: "failed",
            failureReason: storageDiagnostics.storageError,
          },
          { merge: true },
        )

        logPanicScanStructured("step", {
          requestId,
          uploadAttemptId,
          step: "storage.upload",
          status: "error",
          elapsedMs: Date.now() - storageStartedAt,
        })
        finalizeAttempt("error", { stage: "storage", code: "STORAGE_UPLOAD_FAILED" })
        return createErrorResponse({
          code: "STORAGE_UPLOAD_FAILED",
          message: storageDiagnostics.storageError,
          stage: "storage",
          status: 500,
          diagnostics,
          requestId,
        })
      }
    } else if (bucketName) {
      storageDiagnostics.storageError = "Firebase storage client unavailable"
      diagnostics.storageError = storageDiagnostics.storageError
    } else {
      storageDiagnostics.storageError = "FIREBASE_STORAGE_BUCKET is not set"
      diagnostics.storageError = storageDiagnostics.storageError
    }

    diagnostics.storageConfigured = storageDiagnostics.storageConfigured
    diagnostics.storageError = storageDiagnostics.storageError
    await scanRef.set(doc)

    diagnostics.aiConfigured = Boolean(process.env.OPENAI_API_KEY)

    if (!process.env.OPENAI_API_KEY) {
      const message = "Missing OPENAI_API_KEY"
      await scanRef.set(
        {
          status: "failed",
          failureReason: message,
        },
        { merge: true },
      )
      finalizeAttempt("error", { stage: "analysis", code: "AI_NOT_CONFIGURED" })
      return createErrorResponse({
        code: "AI_NOT_CONFIGURED",
        message,
        stage: "analysis",
        diagnostics,
        requestId,
      })
    }

    try {
      diagnostics.ocrPerformed = true
      const ocrStartedAt = Date.now()
      const ocrResult = await performVisionOcr(buffer, uiLocale)
      const extractedText = ocrResult.text
      const foregroundText = filterVisionOcrForeground(ocrResult).text || extractedText
      const ocrElapsedMs = Date.now() - ocrStartedAt
      const sanitized = sanitizeEmailText(foregroundText)
      logPanicScanStructured("step", {
        requestId,
        uploadAttemptId,
        step: "ocr.vision",
        status: "ok",
        elapsedMs: ocrElapsedMs,
        extractedChars: extractedText.length,
        filteredChars: foregroundText.length,
        sanitizedWordCount: sanitized.wordCount,
        sanitizedGreetingOnly: sanitized.greetingOrSignatureOnly,
      })
      if (sanitized.wordCount < 10 || sanitized.greetingOrSignatureOnly) {
        diagnostics.ocrSucceeded = false
        await scanRef.set(
          {
            extractedText,
            extractedTextClean: sanitized.cleanText,
            cleanConfidence: 0,
            status: "insufficient_input",
            failureReason: "INSUFFICIENT_OCR",
          },
          { merge: true },
        )

        logStage(requestId, "ocr", false, "insufficient OCR data")
        finalizeAttempt("error", { stage: "ocr", code: "INSUFFICIENT_OCR" })
        return createErrorResponse({
          code: "INSUFFICIENT_OCR",
          message: "OCR did not capture enough of the message; please try again or type the note manually.",
          stage: "ocr",
          status: 422,
          diagnostics,
          requestId,
        })
      }

      diagnostics.ocrSucceeded = true
      logStage(requestId, "ocr", true)

      const cleanStartedAt = Date.now()
      const cleaned = cleanOcrText(sanitized.cleanText)
      const analysisInputText = cleaned.cleanText || extractedText
      const analysisApproxTokens = approxTokensFromText(analysisInputText)
      const analysisPayloadSizeClass = classifyTextPayloadSize(analysisApproxTokens)
      const analysisLocale = resolvePanicScanLocale({
        uiLocale,
        sourceText: analysisInputText,
        acceptLanguage: request.headers.get("accept-language"),
      })
      logPanicScanStructured("step", {
        requestId,
        uploadAttemptId,
        step: "analysis.prepare",
        status: "ok",
        elapsedMs: Date.now() - cleanStartedAt,
        cleanedChars: cleaned.cleanText.length,
        cleanedApproxTokens: approxTokensFromText(cleaned.cleanText),
        analysisInputSource: cleaned.cleanText ? "cleaned_text" : "raw_ocr_text",
        analysisInputChars: analysisInputText.length,
        analysisApproxTokens,
        analysisPayloadSizeClass,
        cleanConfidence: cleaned.confidence,
        analysisLanguage: analysisLocale.language,
        analysisLanguageSource: analysisLocale.source,
      })

      const openAiInstrumentation: OpenAICallInstrumentation = {
        step: "analysis.openai",
        onCallStart: (event) => {
          openAiCallCount += 1
          logPanicScanStructured("openai_call_start", {
            requestId,
            uploadAttemptId,
            sessionId,
            callIndex: openAiCallCount,
            ...event,
          })
        },
        onRetry: (event) => {
          openAiRetryTriggered = true
          logPanicScanStructured("openai_retry", {
            requestId,
            uploadAttemptId,
            sessionId,
            callIndex: openAiCallCount,
            ...event,
          })
        },
        onCallEnd: (event) => {
          logPanicScanStructured("openai_call_end", {
            requestId,
            uploadAttemptId,
            sessionId,
            callIndex: openAiCallCount,
            ...event,
          })
        },
      }

      let analysisProvider: "openai" | "heuristic_fallback" = "openai"
      let analysis
      try {
        analysis = await analyzePanicMessage(
          analysisInputText,
          analysisLocale.language,
          openAiInstrumentation,
        )
      } catch (error) {
        const busyError = isOpenAIBusyError(error)
        logPanicScanStructured("attempt_error", {
          requestId,
          uploadAttemptId,
          sessionId,
          stage: "analysis.openai",
          elapsedMs: Date.now() - attemptStartedAt,
          busyError,
          openAiCallCount,
          openAiRetryTriggered,
          analysisPayloadSizeClass,
          errorClass: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          openAiRequestId: error instanceof OpenAIRequestError ? error.requestId ?? null : null,
        })
        if (!busyError) {
          throw error
        }

        analysisProvider = "heuristic_fallback"
        analysis = buildHeuristicPanicAnalysis(analysisInputText, analysisLocale.language)
        logPanicScanStructured("analysis_fallback", {
          requestId,
          uploadAttemptId,
          sessionId,
          reason: "openai_busy",
          analysisPayloadSizeClass,
          analysisInputSource: cleaned.cleanText ? "cleaned_text" : "raw_ocr_text",
          openAiCallCount,
          openAiRetryTriggered,
        })
      }
      diagnostics.analysisSucceeded = true
      logStage(requestId, "analysis", true)
      const processingTimeMs = Date.now() - createdAt.getTime()

      const persistStartedAt = Date.now()
      await scanRef.set(
        {
          extractedText,
          extractedTextClean: cleaned.cleanText,
          cleanConfidence: cleaned.confidence,
          classification: analysis.classification,
          analysis: analysis.analysis,
          analysisProvider,
          analysisLanguage: analysisLocale.language,
          analysisLanguageSource: analysisLocale.source,
          processingTimeMs,
          status: "completed",
        },
        { merge: true },
      )
      logPanicScanStructured("step", {
        requestId,
        uploadAttemptId,
        step: "storage.scan_write",
        status: "ok",
        elapsedMs: Date.now() - persistStartedAt,
        scanId: scanRef.id,
      })

      logStage(requestId, "done", true)
      finalizeAttempt("ok", {
        stage: "done",
        scanId: scanRef.id,
        processingTimeMs,
      })
      return createSuccessResponse({
        scanId: scanRef.id,
        diagnostics,
        requestId,
      })
    } catch (error) {
      const busyError = isOpenAIBusyError(error)
      const message = busyError
        ? OPENAI_BUSY_MESSAGE
        : error instanceof Error
          ? error.message
          : "Processing error"
      await scanRef.set(
        {
          status: "failed",
          failureReason: message,
        },
        { merge: true },
      )
      logStage(requestId, "analysis", false, message)
      finalizeAttempt("error", {
        stage: "analysis",
        code: "PROCESSING_FAILED",
        busyError,
      })
      return createErrorResponse({
        code: "PROCESSING_FAILED",
        message,
        stage: "analysis",
        status: busyError ? 503 : 500,
        diagnostics,
        requestId,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error"
    logStage(requestId, "unknown", false, message)
    logPanicScanStructured("attempt_end", {
      requestId,
      status: "error",
      stage: "unknown",
      elapsedMs: Date.now() - attemptStartedAt,
    })
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
