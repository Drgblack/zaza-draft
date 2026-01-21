import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/firebase/server")
vi.mock("@/lib/rate-limit")
vi.mock("@/lib/panic-scan/ocr")
vi.mock("@/lib/panic-scan/clean-ocr")
vi.mock("@/lib/panic-scan/analysis")

import { POST } from "@/app/api/panic-scan/upload/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit } from "@/lib/rate-limit"
import { performVisionOcr } from "@/lib/panic-scan/ocr"
import { cleanOcrText } from "@/lib/panic-scan/clean-ocr"
import { analyzePanicMessage } from "@/lib/panic-scan/analysis"

const storageSave = vi.fn().mockResolvedValue(undefined)
const firestoreSet = vi.fn().mockResolvedValue(undefined)
const mockDocRef = {
  id: "scan-id",
  set: firestoreSet,
}
const firestore = {
  collection: () => ({
    doc: () => mockDocRef,
  }),
}

describe("panic scan upload route", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.OPENAI_API_KEY = "test-key"
    process.env.FIREBASE_STORAGE_BUCKET = "panic-bucket"
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "test-user",
      firestore,
      storage: {
        bucket: () => ({
          file: () => ({ save: storageSave }),
        }),
      },
    })
    vi.mocked(enforcePerUserRateLimit).mockResolvedValue(undefined)
    vi.mocked(performVisionOcr).mockResolvedValue("extracted")
    vi.mocked(cleanOcrText).mockReturnValue({
      cleanText: "text",
      confidence: 1,
      removedLines: 0,
    })
    vi.mocked(analyzePanicMessage).mockImplementation(() => {
      throw new Error("analysis failed")
    })
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.FIREBASE_STORAGE_BUCKET
  })

  it("returns structured JSON when analysis fails", async () => {
    const fakeFile = {
      arrayBuffer: async () => Buffer.from("data"),
      name: "panic.png",
      type: "image/png",
      size: 4,
    }
    const fakeFormData = {
      get: (key: string) => {
        if (key === "file") return fakeFile
        if (key === "platform") return "web"
        if (key === "sessionId") return "session-123"
        return null
      },
    }

    const request = {
      formData: async () => fakeFormData,
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error.stage).toBe("analysis")
    expect(body.stage).toBe("analysis")
    expect(body.error.code).toBe("PROCESSING_FAILED")
    expect(body.diagnostics.aiConfigured).toBe(true)
    expect(body.requestId).toBeDefined()
    expect(response.headers.get("x-request-id")).toBe(body.requestId)
  })
})
