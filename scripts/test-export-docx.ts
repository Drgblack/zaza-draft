import assert from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { buildDocxBuffer } from "@/lib/export/docx"

async function extractZipEntryText(zipPath: string, entryName: string) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zaza-docx-"))
  try {
    const destination = path.join(tempDir, "expanded")
    fs.mkdirSync(destination, { recursive: true })
    await import("node:child_process").then(({ execFileSync }) => {
      execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
        ],
        { stdio: "pipe" },
      )
    })
    return fs.readFileSync(path.join(destination, entryName), "utf8")
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function runTest() {
  const buffer = await buildDocxBuffer({
    draftText: `Subject: Homework update

Dear Parent/Carer,

Johnny has been trying hard this week.
He still struggles with focus, but he is making small steps.

Kind regards,
Dr Greg Blackburn`,
    language: "en",
    mode: "parent_message",
  })

  const asBuffer = Buffer.from(buffer)
  if (asBuffer.length === 0) {
    throw new Error("DOCX buffer is empty.")
  }

  const prefix = asBuffer.slice(0, 2).toString("utf-8")
  if (prefix !== "PK") {
    throw new Error("DOCX buffer does not start with ZIP header.")
  }

  const contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (!contentType.includes("wordprocessingml")) {
    throw new Error("Incorrect DOCX MIME.")
  }

  const filename = `zaza-draft-${new Date().toISOString().replace(/[:.]/g, "-")}.docx`
  if (!filename.endsWith(".docx")) {
    throw new Error("Filename must end with .docx.")
  }

  const outputPath = path.join(process.cwd(), "tmp-export-smoke-test.docx")
  fs.writeFileSync(outputPath, asBuffer)
  assert(fs.existsSync(outputPath), "Smoke test DOCX file should be written to disk")

  const footerXml = await extractZipEntryText(outputPath, path.join("word", "footer1.xml"))
  const documentXml = await extractZipEntryText(outputPath, path.join("word", "document.xml"))
  assert(footerXml.includes("zazadraft.com"), "Footer XML should contain the left footer text")
  assert(footerXml.includes("Zaza — Just Teach"), "Footer XML should contain the right footer text")
  assert(documentXml.includes("footerReference"), "Document XML should reference the footer")
  assert(documentXml.includes("Kind regards"), "Document XML should include the closing line")
  assert(documentXml.includes("Dr Greg Blackburn"), "Document XML should include the sender name")

  console.log(`DOCX export smoke test passed: ${outputPath}`)
}

runTest().catch((error) => {
  console.error(error)
  process.exit(1)
})
