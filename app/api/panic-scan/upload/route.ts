import { NextResponse } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit, RateLimitError } from "@/lib/rate-limit"
import { analyzePanicMessage } from "@/lib/panic-scan/analysis"
import { performVisionOcr } from "@/lib/panic-scan/ocr"
import type { PanicScanDocument } from "@/lib/panic-scan/types"

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const SCAN_TTL_MS = 24 * 60 * 60 * 1000

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

  if (!file || typeof file === "string") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MISSING_FILE", message: "Please attach an image." },
      },
      { status: 400 },
    )
  }

  if (!["web", "mobile_ios", "mobile_android"].includes(platform)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_PLATFORM", message: "Unsupported platform." },
      },
      { status: 400 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FILE_TOO_LARGE", message: "Image must be under 5MB." },
      },
      { status: 413 },
    )
  }

  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status = error instanceof Error && error.name === "FirebaseAuthorizationError" ? 401 : 401
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status },
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
    await enforcePerUserRateLimit(uid, firestore, { docName: "panicScanUpload" })
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
    console.error("[panic-scan] Rate limit check failed", error)
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

  await scanRef.set(doc)

  try {
    const bucket = storage.bucket(bucketName)
    await bucket.file(doc.mediaPath).save(buffer, { metadata: { contentType: file.type || "application/octet-stream" } })

    const extractedText = await performVisionOcr(buffer)
    const analysis = await analyzePanicMessage(extractedText)
    const processingTimeMs = Date.now() - createdAt.getTime()

    await scanRef.set(
      {
        extractedText,
        classification: analysis.classification,
        analysis: analysis.analysis,
        processingTimeMs,
        status: "completed",
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[panic-scan] processing failed", error)
    await scanRef.set(
      {
        status: "failed",
        failureReason: (error instanceof Error ? error.message : "Processing error").slice(0, 1024),
      },
      { merge: true },
    )
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROCESSING_FAILED", message: "Unable to analyze the image right now." },
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      scanId: scanRef.id,
      status: "completed",
    },
  })
}
