import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ensureUserDocument } from "@/lib/account-bootstrap"

import {
  buildBillingProfilePatch,
  canAssignRoles,
  createDefaultUserProfile,
  hasAdminAccess,
} from "./roles"
import { getUserRole, requireAdminRole } from "./get-user-role"

const mockAuthorizeFirebaseRequest = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: (...args: unknown[]) => mockAuthorizeFirebaseRequest(...args),
}))

function createProfileFirestore(initialProfiles: Record<string, Record<string, unknown>> = {}) {
  const profileDocs = new Map(Object.entries(initialProfiles))
  const userDocs = new Map<string, Record<string, unknown>>()

  return {
    firestore: {
      collection: (name: string) => ({
        doc: (uid: string) => ({
          get: vi.fn(async () => {
            const source = name === "user_profiles" ? profileDocs : userDocs
            const value = source.get(uid)
            return {
              exists: Boolean(value),
              data: () => value,
            }
          }),
          set: vi.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
            const source = name === "user_profiles" ? profileDocs : userDocs
            const nextValue = options?.merge
              ? { ...(source.get(uid) ?? {}), ...data }
              : data
            source.set(uid, nextValue)
          }),
        }),
      }),
    },
    readProfile: (uid: string) => profileDocs.get(uid),
    readUser: (uid: string) => userDocs.get(uid),
  }
}

describe("zaza roles", () => {
  beforeEach(() => {
    mockAuthorizeFirebaseRequest.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates a default teacher_free profile on signup bootstrap", async () => {
    const store = createProfileFirestore()

    await ensureUserDocument(store.firestore as never, "uid-1", {
      email: "teacher@example.com",
      displayName: "Teacher Example",
    })

    expect(store.readProfile("uid-1")).toMatchObject({
      uid: "uid-1",
      email: "teacher@example.com",
      role: "teacher_free",
      planStatus: "free",
    })
  })

  it("upgrades paid teachers to the teacher role", () => {
    const patch = buildBillingProfilePatch({
      currentRole: "teacher_free",
      planStatus: "active",
      stripeCustomerId: "cus_123",
      now: 123,
    })

    expect(patch).toMatchObject({
      role: "teacher",
      planStatus: "active",
      stripeCustomerId: "cus_123",
      updatedAt: 123,
    })
  })

  it("does not demote manually managed admins on cancellation", () => {
    const patch = buildBillingProfilePatch({
      currentRole: "admin",
      planStatus: "cancelled",
      now: 456,
    })

    expect(patch).toMatchObject({
      role: "admin",
      planStatus: "cancelled",
      updatedAt: 456,
    })
  })

  it("blocks non-admins in requireAdminRole", async () => {
    const store = createProfileFirestore({
      teacher: createDefaultUserProfile({
        uid: "teacher",
        uidHash: "hash-1",
        email: "teacher@example.com",
        now: 1,
      }),
    })
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "teacher",
      firestore: store.firestore,
    })

    const result = await requireAdminRole(
      new Request("https://app.zazadraft.com/admin/analytics") as never,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get("location")).toContain("/admin/login")
  })

  it("passes admins through requireAdminRole", async () => {
    const store = createProfileFirestore({
      admin: {
        ...createDefaultUserProfile({
          uid: "admin",
          uidHash: "hash-2",
          email: "admin@example.com",
          now: 1,
        }),
        role: "admin",
      },
    })
    mockAuthorizeFirebaseRequest.mockResolvedValue({
      uid: "admin",
      firestore: store.firestore,
    })

    const result = await requireAdminRole(
      new Request("https://app.zazadraft.com/admin/analytics") as never,
    )

    expect(result).toEqual({ uid: "admin", role: "admin" })
  })

  it("returns teacher_free when a user profile is missing", async () => {
    const store = createProfileFirestore()

    const role = await getUserRole("missing", store.firestore as never)
    expect(role).toBe("teacher_free")
  })

  it("confirms the admin permission helper matrix", () => {
    expect(hasAdminAccess("super_admin")).toBe(true)
    expect(hasAdminAccess("admin")).toBe(true)
    expect(hasAdminAccess("school_admin")).toBe(false)
    expect(hasAdminAccess("teacher")).toBe(false)
    expect(hasAdminAccess("teacher_free")).toBe(false)
    expect(canAssignRoles("super_admin")).toBe(true)
    expect(canAssignRoles("admin")).toBe(false)
  })
})
