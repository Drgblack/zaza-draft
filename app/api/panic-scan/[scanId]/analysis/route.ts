import { NextResponse, type NextRequest } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

function extractScanId(request: Request | NextRequest) {
  const url = new URL(request.url)
  const segments = url.pathname.split("/").filter(Boolean)
  return segments[segments.length - 2] ?? ""
}

export async function GET(request: NextRequest) {
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    )
  }

  const { uid, firestore } = authContext
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

  return NextResponse.json({
    success: true,
    data: {
      scanId,
      status: data.status,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      extractedText: data.extractedText ?? null,
      extractedTextClean: data.extractedTextClean ?? null,
      cleanConfidence:
        typeof data.cleanConfidence === "number" ? data.cleanConfidence : null,
      classification: data.classification ?? null,
      analysis: data.analysis ?? null,
      analysisProvider: data.analysisProvider ?? null,
      analysisLanguage: data.analysisLanguage ?? null,
      analysisLanguageSource: data.analysisLanguageSource ?? null,
      uiLocale: data.uiLocale ?? null,
      failureReason: data.failureReason ?? null,
      processingTimeMs: data.processingTimeMs ?? null,
    },
  })
}
