import { NextResponse, type RouteHandlerContext } from "next/server"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

export async function GET(
  request: Request,
  context: RouteHandlerContext<{ scanId: string }>,
) {
  const { scanId } = context.params
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
      classification: data.classification ?? null,
      analysis: data.analysis ?? null,
      failureReason: data.failureReason ?? null,
      processingTimeMs: data.processingTimeMs ?? null,
    },
  })
}
