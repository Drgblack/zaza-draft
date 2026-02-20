import { afterEach, describe, expect, it, vi } from "vitest"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockFetchDraftEntitlement = vi.fn()
const mockBuildDocxBuffer = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    constructor(
      message: string,
      public statusCode: number,
    ) {
      super(message)
      this.name = "FirebaseAuthorizationError"
    }
  },
}))

vi.mock("@/lib/zaza-id/client", () => ({
  fetchDraftEntitlement: (...args: unknown[]) => mockFetchDraftEntitlement(...args),
  ZazaIdClientError: class ZazaIdClientError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public payload: unknown = null,
    ) {
      super(message)
      this.name = "ZazaIdClientError"
    }
  },
}))

vi.mock("@/lib/export/docx", () => ({
  buildDocxBuffer: (...args: unknown[]) => mockBuildDocxBuffer(...args),
}))

import { POST as postPdf } from "@/app/api/export/pdf/route"
import { POST as postDocx } from "@/app/api/export/docx/route"

const baseEntitlement = {
  userId: "uid-1",
  productKey: "draft" as const,
  hasAccess: true,
  accessType: "paid" as const,
  expiresAt: null,
  source: "direct" as const,
  sourceOrgId: null,
  licenceId: "lic_1",
}

function buildRequest(url: string, draftText = "Draft body text") {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token-123",
    },
    body: JSON.stringify({ draftText }),
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("export route entitlement gating", () => {
  it("returns 403 when entitlement denies access (pdf + docx)", async () => {
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      auth: null,
      firestore: null,
      storage: null,
    })
    mockFetchDraftEntitlement.mockResolvedValue({
      ...baseEntitlement,
      hasAccess: false,
      accessType: "none",
      source: "none",
      licenceId: null,
    })

    const pdfResponse = await postPdf(buildRequest("http://localhost/api/export/pdf"))
    const docxResponse = await postDocx(buildRequest("http://localhost/api/export/docx"))

    expect(pdfResponse.status).toBe(403)
    expect(await pdfResponse.json()).toEqual({ error: "not_entitled" })

    expect(docxResponse.status).toBe(403)
    expect(await docxResponse.json()).toEqual({ error: "not_entitled" })
  })

  it("allows export when entitlement is active", async () => {
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      auth: null,
      firestore: null,
      storage: null,
    })
    mockFetchDraftEntitlement.mockResolvedValue(baseEntitlement)
    mockBuildDocxBuffer.mockResolvedValue(Buffer.from("docx-data"))

    const pdfResponse = await postPdf(buildRequest("http://localhost/api/export/pdf", "PDF export body"))
    expect(pdfResponse.status).toBe(200)
    expect(pdfResponse.headers.get("content-type")).toBe("application/pdf")

    const docxResponse = await postDocx(buildRequest("http://localhost/api/export/docx", "DOCX export body"))
    expect(docxResponse.status).toBe(200)
    expect(docxResponse.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    expect(mockBuildDocxBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        draftText: "DOCX export body",
      }),
    )
    expect(mockFetchDraftEntitlement).toHaveBeenCalledWith("token-123")
  })
})
