import assert from "node:assert"
import { collectUserExportData, createExportPayload } from "../lib/account-data"

const mockFirestore: any = {
  collection(name: string) {
    if (name !== "users") {
      return {
        doc: () => ({
          get: async () => ({ exists: false, data: () => null }),
        }),
      }
    }

    return {
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({
            displayName: "Test Editor",
            email: "test@zaza.com",
            monthlyUsage: { month: "2025-12", generationCount: 3 },
          }),
        }),
        collection(collectionName: string) {
          if (collectionName === "snippets") {
            return {
              get: async () => ({
                docs: [
                  {
                    id: "snippet-1",
                    data: () => ({ generatedText: "Hello", tone: "warm" }),
                  },
                ],
              }),
            }
          }
          if (collectionName === "diagnostics") {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({ lastModelUsed: "gpt-4o-mini" }),
                }),
              }),
            }
          }
          return {
            get: async () => ({ docs: [] }),
          }
        },
      }),
    }
  },
}

async function main() {
  const exportData = await collectUserExportData(mockFirestore, "uid-123")
  assert.strictEqual(exportData.user?.displayName, "Test Editor")
  assert.strictEqual(exportData.snippets.length, 1)
  assert.strictEqual(exportData.diagnostics?.lastModelUsed, "gpt-4o-mini")

  const { body, headers } = createExportPayload(exportData)
  assert.strictEqual(headers.get("content-type"), "application/json")
  const disposition = headers.get("content-disposition") ?? ""
  assert(disposition.includes("attachment; filename=\"zaza-draft-export"))

  const parsed = JSON.parse(body)
  assert(parsed.user.displayName === "Test Editor")
  console.log("Account export helper test passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
