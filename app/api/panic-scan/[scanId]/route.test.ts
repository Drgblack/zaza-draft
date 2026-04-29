import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase/server")

import { DELETE } from "@/app/api/panic-scan/[scanId]/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const storageDelete = vi.fn().mockResolvedValue(undefined)
const firestoreSet = vi.fn().mockResolvedValue(undefined)
const firestoreGet = vi.fn()

function createFirestoreDoc() {
  return {
    get: firestoreGet,
    set: firestoreSet,
  }
}

describe("DELETE /api/panic-scan/[scanId]", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.FIREBASE_STORAGE_BUCKET = "panic-bucket"
  })

  it("marks the scan deleted and removes the stored media when available", async () => {
    firestoreGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "teacher-1",
        mediaPath: "panic_scans/scan-123/upload.png",
      }),
    })
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "teacher-1",
      firestore: {
        collection: () => ({
          doc: () => createFirestoreDoc(),
        }),
      } as never,
      storage: {
        bucket: () => ({
          file: () => ({
            delete: storageDelete,
          }),
        }),
      } as never,
    } as never)

    const response = await DELETE(
      new Request("https://example.com/api/panic-scan/scan-123", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token",
        },
      }) as never,
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(storageDelete).toHaveBeenCalledWith({ ignoreNotFound: true })
    expect(firestoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "deleted",
        deletionStatus: "storage_deleted",
      }),
      { merge: true },
    )
  })

  it("returns a failure when Firestore is unavailable", async () => {
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "teacher-1",
      firestore: null,
      storage: null,
    } as never)

    const response = await DELETE(
      new Request("https://example.com/api/panic-scan/scan-123", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token",
        },
      }) as never,
    )

    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe("FIRESTORE_UNAVAILABLE")
  })
})
