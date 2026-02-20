import PDFDocument from "pdfkit"
import { NextResponse } from "next/server"
import { authorizeFirebaseRequest, FirebaseAuthorizationError } from "@/lib/firebase/server"
import { fetchDraftEntitlement, ZazaIdClientError } from "@/lib/zaza-id/client"
import { hasDraftAccess } from "@/lib/zaza-id/types"

const FILENAME_PREFIX = "zaza-draft"

function generateTimestampedFilename(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-")
  return `${FILENAME_PREFIX}-${iso}.pdf`
}

function validateDraftText(draftText: unknown): draftText is string {
  return typeof draftText === "string" && draftText.trim().length > 0
}

function buildPdfBuffer(text: string): Promise<Buffer> {
  const doc = new PDFDocument({
    autoFirstPage: false,
    size: "A4",
    margin: 48,
  })
  const chunks: Buffer[] = []

  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)))

  const completion = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
  })

  doc.addPage()
  doc.font("Times-Roman")
  doc.fontSize(12)
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    doc.text(line, {
      lineGap: 4,
    })
  }
  doc.end()

  return completion
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.slice("Bearer ".length).trim()
  return token || null
}

export async function POST(request: Request) {
  try {
    await authorizeFirebaseRequest(request)
  } catch (error) {
    const status = error instanceof FirebaseAuthorizationError ? error.statusCode : 401
    return NextResponse.json(
      { errorCode: "UNAUTHORIZED", message: (error as Error).message || "Unauthorized" },
      { status },
    )
  }

  const idToken = extractBearerToken(request)
  if (!idToken) {
    return NextResponse.json(
      { errorCode: "UNAUTHORIZED", message: "Missing authorization token." },
      { status: 401 },
    )
  }

  try {
    const entitlement = await fetchDraftEntitlement(idToken)
    if (!hasDraftAccess(entitlement)) {
      return NextResponse.json({ error: "not_entitled" }, { status: 403 })
    }
  } catch (error) {
    if (error instanceof ZazaIdClientError && (error.statusCode === 401 || error.statusCode === 403)) {
      return NextResponse.json({ error: "not_entitled" }, { status: 403 })
    }

    return NextResponse.json(
      { errorCode: "ENTITLEMENT_UNAVAILABLE", message: "Unable to verify entitlements right now." },
      { status: 502 },
    )
  }

  const payload = await request.json().catch(() => null)

  if (!payload || !validateDraftText(payload.draftText)) {
    return NextResponse.json(
      { errorCode: "MISSING_DRAFT_TEXT", message: "Draft text is required for export." },
      { status: 400 },
    )
  }

  const buffer = await buildPdfBuffer(payload.draftText.trim())
  const body = new Uint8Array(buffer)

  const headers = new Headers()
  headers.set("Content-Type", "application/pdf")
  headers.set("Content-Disposition", `attachment; filename="${generateTimestampedFilename()}"`)

  return new NextResponse(body, { headers })
}
