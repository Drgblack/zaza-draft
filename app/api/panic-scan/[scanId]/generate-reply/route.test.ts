import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
}))

import { POST } from "./route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const snapshotData = {
  userId: "test-user",
  status: "completed",
  extractedText: "Hello Ms Smith,\nMy child came home upset about the homework load.\nKind regards,\nJordan Lee",
  extractedTextClean: "My child came home upset about the homework load and needs a calmer plan for next week.",
  cleanConfidence: 0.41,
  classification: {
    messageType: "parent_complaint",
    confidenceScore: 82,
  },
}

const firestore = {
  collection: () => ({
    doc: () => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => snapshotData,
      }),
    }),
  }),
}

describe("panic scan generate-reply route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "test-user",
      firestore,
    } as never)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              generatedDraft: "Reply draft",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    )
  })

  it("passes explicit panic scan provenance into draft generation", async () => {
    const request = new Request("https://example.com/api/panic-scan/scan-123/generate-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({ tone: "professional", language: "en" }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      inputMode: "panic_scan",
      sourceType: "ocr_text",
      scanId: "scan-123",
      messageType: "parent_complaint",
      ocrConfidence: 0.41,
      panicClassificationConfidence: 82,
    })
    expect(body.situationRaw).toContain("My child came home upset")
  })
})
