import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { PDFDocument } from "pdf-lib"
import { buildPdfBuffer } from "@/lib/export/pdf"

async function main() {
  const pdfBuffer = await buildPdfBuffer(
    {
      draftText: [
        "Subject: Classroom Update",
        "",
        "Dear Parent/Guardian,",
        "",
        "I wanted to share a short update about the lesson today.",
        "The student found it difficult to stay focused during parts of the session.",
        "",
        "Kind regards,",
        "Teacher",
      ].join("\n"),
      language: "en",
      mode: "parent_message",
    },
  )

  const outputPath = path.join(process.cwd(), "tmp-export-smoke-test.pdf")
  fs.writeFileSync(outputPath, pdfBuffer)

  const signature = new Uint8Array(pdfBuffer.subarray(0, 4))
  assert.strictEqual(signature[0], 0x25, "PDF should start with %")
  assert.strictEqual(signature[1], 0x50, "PDF should start with P")
  assert.strictEqual(signature[2], 0x44, "PDF should start with D")
  assert.strictEqual(signature[3], 0x46, "PDF should start with F")

  const reopened = await PDFDocument.load(pdfBuffer)
  assert(reopened.getPageCount() >= 1, "Generated PDF should contain at least one page")
  assert(fs.existsSync(outputPath), "Smoke test PDF file should be written to disk")

  console.log(`PDF export smoke test passed: ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
