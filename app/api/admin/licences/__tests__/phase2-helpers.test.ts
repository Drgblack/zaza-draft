import { describe, expect, it } from "vitest"

import {
  assignUserToLicence,
  createSchoolAndLicence,
  removeUserFromLicence,
  updateSchoolAndLicence,
} from "@/lib/admin/licences"

type DocRecord = Record<string, unknown>

function clone<T>(value: T): T {
  if (value === undefined) {
    return value
  }
  return JSON.parse(JSON.stringify(value))
}

function createFirestore(seed?: Record<string, DocRecord>) {
  const store = new Map<string, DocRecord>()
  let autoId = 0
  let runTransactionCalls = 0

  for (const [path, value] of Object.entries(seed ?? {})) {
    store.set(path, clone(value))
  }

  function createDocRef(path: string) {
    return {
      id: path.split("/").at(-1) ?? "",
      path,
    }
  }

  function createCollectionRef(path: string) {
    return {
      doc: (id?: string) => createDocRef(`${path}/${id ?? `auto-${++autoId}`}`),
    }
  }

  const firestore = {
    collection: (name: string) => createCollectionRef(name),
    runTransaction: async <T>(callback: (transaction: {
      get: (ref: { path: string }) => Promise<{
        exists: boolean
        data: () => DocRecord | undefined
      }>
      set: (ref: { path: string }, data: DocRecord, options?: { merge?: boolean }) => void
    }) => Promise<T>) => {
      runTransactionCalls += 1
      const transaction = {
        get: async (ref: { path: string }) => ({
          exists: store.has(ref.path),
          data: () => clone(store.get(ref.path)),
        }),
        set: (ref: { path: string }, data: DocRecord, options?: { merge?: boolean }) => {
          if (options?.merge) {
            store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...clone(data) })
            return
          }
          store.set(ref.path, clone(data))
        },
      }

      return callback(transaction)
    },
  }

  return {
    firestore,
    get(path: string) {
      return clone(store.get(path))
    },
    getByPrefix(prefix: string) {
      return Array.from(store.entries()).filter(([path]) => path.startsWith(prefix))
    },
    get runTransactionCalls() {
      return runTransactionCalls
    },
  }
}

describe("Phase 2 licence helpers", () => {
  it("creates school and licence records in a transaction", async () => {
    const store = createFirestore()

    const result = await createSchoolAndLicence({
      firestore: store.firestore as never,
      adminUid: "super-admin",
      input: {
        schoolName: "North High",
        contactEmail: "admin@north.example",
        domains: ["north.example"],
        licenceType: "school",
        seatLimit: 20,
        status: "active",
        startDate: 100,
        endDate: 200,
        notes: "pilot",
      },
    })

    expect(store.runTransactionCalls).toBe(1)
    expect(result.schoolId).toBeTruthy()
    expect(result.licenceId).toBeTruthy()
    expect(store.get(`schools/${result.schoolId}`)).toMatchObject({
      schoolName: "North High",
      createdBy: "super-admin",
      seatLimit: 20,
      seatsUsed: 0,
    })
    expect(store.get(`licences/${result.licenceId}`)).toMatchObject({
      schoolId: result.schoolId,
      seatLimit: 20,
      seatsUsed: 0,
      status: "active",
    })
  })

  it("rejects lowering seatLimit below seatsUsed", async () => {
    const store = createFirestore({
      "licences/licence-1": {
        schoolId: "school-1",
        licenceType: "school",
        seatLimit: 5,
        seatsUsed: 3,
        status: "active",
        startDate: 100,
        endDate: 200,
        createdAt: 10,
        updatedAt: 20,
      },
      "schools/school-1": {
        schoolName: "North High",
        contactEmail: "admin@north.example",
        domains: ["north.example"],
        licenceType: "school",
        seatLimit: 5,
        seatsUsed: 3,
        status: "active",
        startDate: 100,
        endDate: 200,
        notes: "pilot",
        createdAt: 10,
        updatedAt: 20,
        createdBy: "super-admin",
      },
    })

    await expect(
      updateSchoolAndLicence({
        firestore: store.firestore as never,
        licenceId: "licence-1",
        input: { seatLimit: 2 },
      }),
    ).rejects.toThrow("SEAT_LIMIT_BELOW_USAGE")
  })

  it("assigns a user to a licence and increments seatsUsed", async () => {
    const now = Date.now()
    const store = createFirestore({
      "licences/licence-1": {
        schoolId: "school-1",
        licenceType: "school",
        seatLimit: 5,
        seatsUsed: 1,
        status: "active",
        startDate: now - 1_000,
        endDate: now + 1_000,
        createdAt: 10,
        updatedAt: 20,
      },
      "schools/school-1": {
        schoolName: "North High",
        contactEmail: "admin@north.example",
        domains: ["north.example"],
        licenceType: "school",
        seatLimit: 5,
        seatsUsed: 1,
        status: "active",
        startDate: 100,
        endDate: 200,
        notes: "pilot",
        createdAt: 10,
        updatedAt: 20,
        createdBy: "super-admin",
      },
      "users/teacher-1": {
        email: "teacher@example.com",
        plan: "free",
        monthlyDraftLimit: 5,
      },
      "user_profiles/teacher-1": {
        email: "teacher@example.com",
        role: "teacher",
      },
    })

    await assignUserToLicence({
      firestore: store.firestore as never,
      targetUid: "teacher-1",
      licenceId: "licence-1",
      adminUid: "super-admin",
      fallbackEmail: "teacher@example.com",
    })

    expect(store.get("school_memberships/teacher-1")).toMatchObject({
      schoolId: "school-1",
      licenceId: "licence-1",
      status: "active",
      assignedBy: "super-admin",
    })
    expect(store.get("user_profiles/teacher-1")).toMatchObject({
      schoolId: "school-1",
      licenceId: "licence-1",
    })
    expect(store.get("users/teacher-1")).toMatchObject({
      entitlements: {
        planSource: "school_licence",
      },
    })
    expect(store.get("licences/licence-1")).toMatchObject({
      seatsUsed: 2,
    })
    expect(store.get("schools/school-1")).toMatchObject({
      seatsUsed: 2,
    })
  })

  it("never decrements seatsUsed below zero when removing a member", async () => {
    const store = createFirestore({
      "licences/licence-1": {
        schoolId: "school-1",
        licenceType: "school",
        seatLimit: 5,
        seatsUsed: 0,
        status: "active",
        startDate: 100,
        endDate: 200,
        createdAt: 10,
        updatedAt: 20,
      },
      "schools/school-1": {
        schoolName: "North High",
        contactEmail: "admin@north.example",
        domains: ["north.example"],
        licenceType: "school",
        seatLimit: 5,
        seatsUsed: 0,
        status: "active",
        startDate: 100,
        endDate: 200,
        notes: "pilot",
        createdAt: 10,
        updatedAt: 20,
        createdBy: "super-admin",
      },
      "school_memberships/teacher-1": {
        schoolId: "school-1",
        licenceId: "licence-1",
        assignedAt: 100,
        assignedBy: "super-admin",
        status: "active",
      },
      "user_profiles/teacher-1": {
        email: "teacher@example.com",
        role: "teacher",
        schoolId: "school-1",
        licenceId: "licence-1",
      },
      "users/teacher-1": {
        email: "teacher@example.com",
        entitlements: {
          planSource: "school_licence",
        },
      },
    })

    await removeUserFromLicence({
      firestore: store.firestore as never,
      targetUid: "teacher-1",
      licenceId: "licence-1",
    })

    expect(store.get("school_memberships/teacher-1")).toMatchObject({
      status: "removed",
    })
    expect(store.get("user_profiles/teacher-1")).toMatchObject({
      schoolId: null,
      licenceId: null,
    })
    expect(store.get("users/teacher-1")).toMatchObject({
      entitlements: {
        planSource: null,
      },
    })
    expect(store.get("licences/licence-1")).toMatchObject({
      seatsUsed: 0,
    })
    expect(store.get("schools/school-1")).toMatchObject({
      seatsUsed: 0,
    })
  })
})
