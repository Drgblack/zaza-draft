import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

function extractScanId(request: Request | NextRequest) {
  const url = new URL(request.url)
  const segments = url.pathname.split("/").filter(Boolean)
  return segments[segments.length - 1] ?? ""
}

export async function DELETE(request: NextRequest) {
  const scanId = extractScanId(request)
  if (!scanId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_ID", message: "Missing scan identifier." } },
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

  const { uid, firestore, storage } = authContext
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

  const deletedAt = new Date().toISOString()
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  let mediaDeletedAt: string | null = null
  let deletionStatus: "storage_deleted" | "pending_storage_cleanup" = "storage_deleted"

  if (storage && bucketName && typeof data?.mediaPath === "string" && data.mediaPath.trim()) {
    try {
      await storage.bucket(bucketName).file(data.mediaPath).delete({ ignoreNotFound: true })
      mediaDeletedAt = deletedAt
    } catch (error) {
      console.warn("[panic-scan] storage delete failed, deferring cleanup", {
        scanId,
        mediaPath: data.mediaPath,
        error: error instanceof Error ? error.message : String(error),
      })
      deletionStatus = "pending_storage_cleanup"
    }
  }

  await docRef.set(
    {
      status: "deleted",
      deletedAt,
      mediaDeletedAt,
      deletionStatus,
      expiresAt: deletedAt,
      extractedText: FieldValue.delete(),
      extractedTextClean: FieldValue.delete(),
      cleanConfidence: FieldValue.delete(),
      classification: FieldValue.delete(),
      analysis: FieldValue.delete(),
      analysisProvider: FieldValue.delete(),
      analysisLanguage: FieldValue.delete(),
      analysisLanguageSource: FieldValue.delete(),
      failureReason: FieldValue.delete(),
      processingTimeMs: FieldValue.delete(),
    },
    { merge: true },
  )

  return NextResponse.json({
    success: true,
    data: {
      scanId,
      deletedAt,
      mediaDeletedAt,
      deletionStatus,
    },
  })
}
