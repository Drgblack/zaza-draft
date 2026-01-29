import type { Firestore } from "firebase-admin/firestore"

import { afterEach, describe, expect, it, vi } from "vitest"

import * as usageModule from "./usage"
import { getUserEntitlements } from "./entitlements"
import { getCurrentMonthKey } from "./usage"

const usageRecord = {
  month: getCurrentMonthKey(),
  generationCount: 0,
  lastReset: new Date().toISOString(),
}

function createMockFirestore(userDoc: Record<string, unknown>, licenceDocs: Record<string, Record<string, unknown>>) {
  const docCache = new Map<string, ReturnType<typeof createDocStub>>()

  function createDocStub() {
    return {
      get: vi.fn(async () => ({ exists: false, data: () => undefined })),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    }
  }

  function getDoc(name: string, id: string) {
    const key = `${name}/${id}`
    if (!docCache.has(key)) {
      const stub = createDocStub()
      if (name === "users") {
        stub.get = vi.fn(async () => ({
          exists: true,
          data: () => userDoc,
        }))
      }
      if (name === "schoolLicences") {
        const licence = licenceDocs[id]
        stub.get = vi.fn(async () => ({
          exists: Boolean(licence),
          data: () => licence,
        }))
      }
      docCache.set(key, stub)
    }
    return docCache.get(key)!
  }

  return {
    collection: (name: string) => ({
      doc: (id: string) => getDoc(name, id),
    }),
  } as unknown as Firestore
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getUserEntitlements override checks", () => {
  beforeEach(() => {
    vi.spyOn(usageModule, "fetchUsageRecord").mockResolvedValue(usageRecord)
  })

  it("prioritizes a uid-level override when not expired", async () => {
    const future = new Date(Date.now() + 1_000_000).toISOString()
    const db = createMockFirestore(
      {
        email: "teacher@example.com",
        entitlements: {
          planOverride: "pro",
          expiresAt: future,
        },
      },
      {},
    )

    const entitlements = await getUserEntitlements("uid", db)
    expect(entitlements.plan).toBe("pro")
  })

  it("treats a verified domain licence as pro", async () => {
    const future = new Date(Date.now() + 1_000_000).toISOString()
    const domain = "school.edu"
    const db = createMockFirestore(
      {
        email: `teacher@${domain}`,
      },
      {
        [domain]: {
          domain,
          plan: "pro",
          expiresAt: future,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    )

    const entitlements = await getUserEntitlements("uid", db)
    expect(entitlements.plan).toBe("pro")
  })

  it("falls back when an override has expired", async () => {
    const past = new Date(Date.now() - 1_000_000).toISOString()
    const db = createMockFirestore(
      {
        entitlements: {
          planOverride: "pro",
          expiresAt: past,
        },
      },
      {},
    )

    const entitlements = await getUserEntitlements("uid", db)
    expect(entitlements.plan).toBe("free")
  })

  it("treats invalid override expiry as expired", async () => {
    const db = createMockFirestore(
      {
        entitlements: {
          planOverride: "pro",
          expiresAt: "not-a-date",
        },
      },
      {},
    )

    const entitlements = await getUserEntitlements("uid", db)
    expect(entitlements.plan).toBe("free")
  })

  it("ignores a domain licence with invalid expiry", async () => {
    const domain = "school.edu"
    const db = createMockFirestore(
      {
        email: `teacher@${domain}`,
      },
      {
        [domain]: {
          domain,
          plan: "pro",
          expiresAt: "invalid date",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    )

    const entitlements = await getUserEntitlements("uid", db)
    expect(entitlements.plan).toBe("free")
  })
})
