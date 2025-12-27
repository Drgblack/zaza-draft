import PDFDocument from "pdfkit"
import { NextResponse } from "next/server"

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

export async function POST(request: Request) {
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
