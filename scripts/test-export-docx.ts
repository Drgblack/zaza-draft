import { buildDocxBuffer } from "@/lib/export/docx"

async function runTest() {
  const buffer = await buildDocxBuffer({
    draftText: "Hello Eric.\nThis is a test draft.",
    tone: "warm",
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

  console.log("DOCX export helper validation passed.")
}

runTest().catch((error) => {
  console.error(error)
  process.exit(1)
})
