import { NextResponse } from "next/server"
import { buildDocxBuffer } from "@/lib/export/docx"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { extractBearerToken } from "@/lib/auth/bearer"
import { hasDraftEntitlementAccess, resolveDraftEntitlement } from "@/lib/draft-entitlements"

interface ExportDocxRequest {
  draftText: string
  mode?: string
  tone?: string
  language?: string
}

export async function POST(request: Request) {
  let authContext
  try {
    authContext = await authorizeFirebaseRequest(request)
  } catch (error) {
    const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: (error as Error).message || "Unauthorized",
        },
      },
      { status },
    )
  }

  const { uid, firestore } = authContext
  if (!firestore) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FIRESTORE_UNAVAILABLE",
          message: "Unable to access Firestore.",
        },
      },
      { status: 500 },
    )
  }

  const idToken = extractBearerToken(request)
  if (!idToken) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing authorization token.",
        },
      },
      { status: 401 },
    )
  }

  try {
    const entitlement = await resolveDraftEntitlement({
      uid,
      firestore,
      idToken,
    })
    if (!hasDraftEntitlementAccess(entitlement.entitlement)) {
      return NextResponse.json({ error: "not_entitled" }, { status: 403 })
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ENTITLEMENT_UNAVAILABLE",
          message: "Unable to verify entitlements.",
        },
      },
      { status: 502 },
    )
  }

  let payload: ExportDocxRequest
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Payload must be JSON.",
        },
      },
      { status: 400 },
    )
  }

  const draftText = typeof payload?.draftText === "string" ? payload.draftText.trim() : ""
  if (!draftText) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_DRAFT",
          message: "Provide the draft text to export.",
        },
      },
      { status: 400 },
    )
  }

  const buffer = await buildDocxBuffer({
    draftText,
    tone: payload?.tone,
    mode: payload?.mode,
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `zaza-draft-${timestamp}.docx`

  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
