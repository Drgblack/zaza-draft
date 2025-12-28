import { NextResponse } from "next/server"
import { buildDocxBuffer } from "@/lib/export/docx"

interface ExportDocxRequest {
  draftText: string
  mode?: string
  tone?: string
  language?: string
}

export async function POST(request: Request) {
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
