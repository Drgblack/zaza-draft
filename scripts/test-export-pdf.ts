import assert from "node:assert"
import { POST } from "../app/api/export/pdf/route"

async function main() {
  const payload = {
    draftText: "Dear parents, the student is improving.",
    tone: "warm",
    mode: "parent_message",
    language: "en",
  }

  const request = new Request("http://localhost/api/export/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const response = await POST(request)
  assert.strictEqual(response.status, 200, "PDF export should return 200")
  const contentType = response.headers.get("content-type")
  assert(contentType?.includes("application/pdf"), "Content-Type should be application/pdf")
  const buffer = await response.arrayBuffer()
  const signature = new Uint8Array(buffer.slice(0, 4))
  assert.strictEqual(signature[0], 0x25, "PDF should start with %")
  assert.strictEqual(signature[1], 0x50, "PDF should start with P")
  assert.strictEqual(signature[2], 0x44, "PDF should start with D")
  assert.strictEqual(signature[3], 0x46, "PDF should start with F")
  console.log("PDF export route test passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
