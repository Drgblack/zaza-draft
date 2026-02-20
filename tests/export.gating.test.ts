import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockBuildDocxBuffer = vi.fn()
const mockGetUserEntitlements = vi.fn()

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

vi.mock("@/lib/export/docx", () => ({
  buildDocxBuffer: (...args: unknown[]) => mockBuildDocxBuffer(...args),
}))

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: (...args: unknown[]) => mockGetUserEntitlements(...args),
}))

import { POST as postPdf } from "@/app/api/export/pdf/route"
import { POST as postDocx } from "@/app/api/export/docx/route"
import { FirebaseAuthorizationError } from "@/lib/firebase/server"

const firestoreStub = {
  collection: vi.fn().mockReturnValue({
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    }),
  }),
}

const localEntitlements = {
  plan: "free" as const,
  usage: {
    plan: "free" as const,
    currentMonthUsage: 0,
    limit: 10,
    remaining: 10,
    unlimited: false,
  },
  usageRecord: {
    month: "2026-02",
    generationCount: 0,
    lastReset: new Date("2026-02-01T00:00:00.000Z").toISOString(),
  },
  isProSubscriber: false,
}

function buildRequest(url: string, draftText = "Draft body text", withAuth = true) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (withAuth) {
    headers.Authorization = "Bearer token-123"
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ draftText }),
  })
}

function mockRemoteEntitlementResponse(body: unknown, status = 200) {
  vi.mocked(global.fetch).mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  )
}

const baseRemotePayload = {
  userId: "uid-1",
  productKey: "draft" as const,
  hasAccess: true,
  accessType: "paid" as const,
  expiresAt: null,
  source: "direct" as const,
  sourceOrgId: null,
  licenceId: "lic_1",
}

describe("export route entitlement gating", () => {
  const originalBaseUrl = process.env.ZAZA_ID_BASE_URL
  const originalFlag = process.env.ZAZA_ID_ENTITLEMENTS_ENABLED

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ZAZA_ID_BASE_URL = "https://zaza-id-and-licences.vercel.app"
    process.env.ZAZA_ID_ENTITLEMENTS_ENABLED = "1"
    global.fetch = vi.fn()
    mockGetUserEntitlements.mockResolvedValue(localEntitlements)
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      auth: null,
      firestore: firestoreStub,
      storage: null,
    })
  })

  afterEach(() => {
    process.env.ZAZA_ID_BASE_URL = originalBaseUrl
    process.env.ZAZA_ID_ENTITLEMENTS_ENABLED = originalFlag
  })

  it("returns 401 when auth is missing", async () => {
    mockAuthorizeFirebaseRequest.mockRejectedValue(
      new FirebaseAuthorizationError("Missing authorization token", 401),
    )

    const pdfResponse = await postPdf(buildRequest("http://localhost/api/export/pdf", "PDF body", false))
    const docxResponse = await postDocx(buildRequest("http://localhost/api/export/docx", "DOCX body", false))

    expect(pdfResponse.status).toBe(401)
    expect(docxResponse.status).toBe(401)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns 403 when remote entitlement denies access", async () => {
    mockRemoteEntitlementResponse({
      ...baseRemotePayload,
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

  it("returns 403 on remote 401 without falling back to local", async () => {
    mockRemoteEntitlementResponse({ error: { code: "unauthorized" } }, 401)

    const pdfResponse = await postPdf(buildRequest("http://localhost/api/export/pdf"))
    const docxResponse = await postDocx(buildRequest("http://localhost/api/export/docx"))

    expect(pdfResponse.status).toBe(403)
    expect(docxResponse.status).toBe(403)
    expect(mockGetUserEntitlements).toHaveBeenCalled()
  })

  it("falls back to local entitlement on remote 5xx and allows export", async () => {
    mockRemoteEntitlementResponse({ error: { code: "upstream_error" } }, 503)
    mockBuildDocxBuffer.mockResolvedValue(Buffer.from("docx-data"))

    const pdfResponse = await postPdf(buildRequest("http://localhost/api/export/pdf", "PDF export body"))
    const docxResponse = await postDocx(buildRequest("http://localhost/api/export/docx", "DOCX export body"))

    expect(pdfResponse.status).toBe(200)
    expect(pdfResponse.headers.get("content-type")).toBe("application/pdf")

    expect(docxResponse.status).toBe(200)
    expect(docxResponse.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    expect(mockBuildDocxBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        draftText: "DOCX export body",
      }),
    )
  })
})
