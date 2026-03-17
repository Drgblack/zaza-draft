import type { Firestore } from "firebase-admin/firestore"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ensureUserDocument } from "./account-bootstrap"
import { getUserEntitlements } from "./entitlements"
import * as usageModule from "./usage"
import { getCurrentMonthKey } from "./usage"

const usageRecord = {
  month: getCurrentMonthKey(),
  generationCount: 0,
  lastReset: new Date().toISOString(),
}

function cloneRecord<T>(value: T): T {
  return value ? JSON.parse(JSON.stringify(value)) as T : value
}

function createStatefulFirestore(initialUserDoc?: Record<string, unknown>) {
  let userDoc = cloneRecord(initialUserDoc)

  const userRef = {
    get: vi.fn(async () => ({
      exists: Boolean(userDoc),
      data: () => userDoc,
    })),
    set: vi.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
      if (options?.merge) {
        userDoc = {
          ...(userDoc ?? {}),
          ...data,
        }
        return
      }

      userDoc = cloneRecord(data)
    }),
  }

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => {
        if (name === "users" && id === "uid") {
          return userRef
        }
        return {
          get: vi.fn(async () => ({ exists: false, data: () => undefined })),
          set: vi.fn(async () => undefined),
        }
      },
    }),
  } as unknown as Firestore

  return {
    db,
    readUserDoc: () => userDoc,
    userRef,
  }
}

describe("ensureUserDocument", () => {
  beforeEach(() => {
    vi.spyOn(usageModule, "fetchUsageRecord").mockResolvedValue(usageRecord)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates a default free user document on first login", async () => {
    const firestore = createStatefulFirestore()

    const created = await ensureUserDocument(firestore.db, "uid")

    expect(created).toBe(true)
    expect(firestore.userRef.set).toHaveBeenCalledTimes(1)
    expect(firestore.readUserDoc()).toMatchObject({
      plan: "free",
      preferredLanguage: "en",
    })
    expect(firestore.readUserDoc()).toHaveProperty("createdAt")
    expect(firestore.readUserDoc()).toHaveProperty("updatedAt")
  })

  it("does not overwrite plan or billing fields on repeat login", async () => {
    const firestore = createStatefulFirestore({
      plan: "pro",
      preferredLanguage: "de",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "active",
    })

    const created = await ensureUserDocument(firestore.db, "uid")

    expect(created).toBe(false)
    expect(firestore.userRef.set).toHaveBeenCalledTimes(1)
    expect(firestore.readUserDoc()).toMatchObject({
      plan: "pro",
      preferredLanguage: "de",
      stripeCustomerId: "cus_123",
      subscriptionStatus: "active",
    })
    expect(firestore.readUserDoc()).toHaveProperty("updatedAt")
  })

  it("keeps an existing accountType pro user on the pro plan", async () => {
    const firestore = createStatefulFirestore({
      accountType: "pro",
    })

    await ensureUserDocument(firestore.db, "uid")
    const entitlements = await getUserEntitlements("uid", firestore.db)

    expect(entitlements.plan).toBe("pro")
  })

  it("keeps an active subscription user on the pro plan", async () => {
    const firestore = createStatefulFirestore({
      stripeCustomerId: "cus_123",
      subscriptionStatus: "active",
    })

    await ensureUserDocument(firestore.db, "uid")
    const entitlements = await getUserEntitlements("uid", firestore.db)

    expect(entitlements.plan).toBe("pro")
  })

  it("keeps a manual entitlement override user on the pro plan", async () => {
    const firestore = createStatefulFirestore({
      entitlements: {
        planOverride: "pro",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    })

    await ensureUserDocument(firestore.db, "uid")
    const entitlements = await getUserEntitlements("uid", firestore.db)

    expect(entitlements.plan).toBe("pro")
  })
})
