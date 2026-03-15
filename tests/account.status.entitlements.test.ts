import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { refreshForcedProUserIds } from "@/lib/dev/forced-pro-users"

const mockAuthorizeFirebaseRequest = vi.fn()
const mockGetUserEntitlements = vi.fn()
const mockIsInternalQaUid = vi.fn()

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

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: (...args: unknown[]) => mockGetUserEntitlements(...args),
}))

vi.mock("@/lib/auth/internal-qa", () => ({
  isInternalQaUid: (...args: unknown[]) => mockIsInternalQaUid(...args),
}))

import { GET } from "@/app/api/account/status/route"

function createFirestoreStub(userDoc: Record<string, unknown> = {}) {
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          data: () => userDoc,
        }),
      }),
    }),
  }
}

const localEntitlements = {
  plan: "free" as const,
  usage: {
    plan: "free" as const,
    currentMonthUsage: 3,
    limit: 10,
    remaining: 7,
    unlimited: false,
  },
  usageRecord: {
    month: "2026-02",
    generationCount: 3,
    lastReset: new Date("2026-02-01T00:00:00.000Z").toISOString(),
  },
  isProSubscriber: false,
}

const remoteEntitlementPayload = {
  userId: "uid-1",
  productKey: "draft" as const,
  hasAccess: true,
  accessType: "paid" as const,
  expiresAt: null,
  source: "direct" as const,
  sourceOrgId: null,
  licenceId: "lic_1",
}

function buildRequest(withAuth = true) {
  const headers: HeadersInit = {}
  if (withAuth) {
    headers.Authorization = "Bearer token-123"
  }
  return new Request("http://localhost/api/account/status", {
    method: "GET",
    headers,
  })
}

function mockRemote(status: number, payload: unknown) {
  vi.mocked(global.fetch).mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  )
}

describe("/api/account/status Zaza ID entitlement wiring", () => {
  const originalBaseUrl = process.env.ZAZA_ID_BASE_URL
  const originalFlag = process.env.ZAZA_ID_ENTITLEMENTS_ENABLED
  const originalForcedProUserIds = process.env.FORCE_PRO_USER_IDS
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ZAZA_ID_BASE_URL = "https://zaza-id-and-licences.vercel.app"
    process.env.ZAZA_ID_ENTITLEMENTS_ENABLED = "1"
    process.env.FORCE_PRO_USER_IDS = ""
    process.env.NODE_ENV = "test"
    refreshForcedProUserIds()
    global.fetch = vi.fn()
    mockIsInternalQaUid.mockReturnValue(false)
    mockGetUserEntitlements.mockResolvedValue(localEntitlements)
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "uid-1",
      auth: null,
      firestore: createFirestoreStub({
        subscriptionStatus: "active",
      }),
      storage: null,
    })
  })

  afterEach(() => {
    process.env.ZAZA_ID_BASE_URL = originalBaseUrl
    process.env.ZAZA_ID_ENTITLEMENTS_ENABLED = originalFlag
    process.env.FORCE_PRO_USER_IDS = originalForcedProUserIds
    process.env.NODE_ENV = originalNodeEnv
    refreshForcedProUserIds()
  })

  it("uses remote entitlement when the feature flag is enabled", async () => {
    mockRemote(200, remoteEntitlementPayload)

    const response = await GET(buildRequest(true))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.draftEntitlementSource).toBe("remote")
    expect(payload.data.draftEntitlement).toEqual(
      expect.objectContaining({
        userId: "uid-1",
        hasAccess: true,
        status: "active",
      }),
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/entitlements?productKey=draft"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    )
  })

  it("falls back to local entitlement on remote timeout", async () => {
    const timeoutError = new Error("Aborted")
    timeoutError.name = "AbortError"
    vi.mocked(global.fetch).mockRejectedValue(timeoutError)

    const response = await GET(buildRequest(true))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.draftEntitlementSource).toBe("local_fallback")
    expect(payload.data.draftEntitlement.hasAccess).toBe(true)
    expect(payload.data.plan).toBe("free")
  })

  it("treats remote 401 as no access without fallback", async () => {
    mockRemote(401, { error: { code: "unauthorized" } })

    const response = await GET(buildRequest(true))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.draftEntitlementSource).toBe("remote_terminal")
    expect(payload.data.draftEntitlement.hasAccess).toBe(false)
    expect(payload.data.draftEntitlement.status).toBe("none")
    expect(payload.data.usage).toEqual(localEntitlements.usage)
  })

  it("keeps local behavior when the feature flag is disabled", async () => {
    process.env.ZAZA_ID_ENTITLEMENTS_ENABLED = "0"

    const response = await GET(buildRequest(true))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.draftEntitlementSource).toBe("local_disabled")
    expect(payload.data.draftEntitlement.hasAccess).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("forces a listed development UID to pro without calling remote entitlements", async () => {
    process.env.NODE_ENV = "development"
    process.env.FORCE_PRO_USER_IDS = "uid-1"
    refreshForcedProUserIds()

    const response = await GET(buildRequest(true))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.draftEntitlementSource).toBe("development_override")
    expect(payload.data.draftEntitlement).toEqual(
      expect.objectContaining({
        userId: "uid-1",
        hasAccess: true,
        status: "active",
      }),
    )
    expect(payload.data.plan).toBe("pro")
    expect(payload.data.usage).toEqual(
      expect.objectContaining({
        plan: "pro",
        unlimited: true,
        limit: null,
        remaining: null,
      }),
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
