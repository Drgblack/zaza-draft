import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/comment-bank/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const queryGet = vi.fn()
const queryLimit = vi.fn()
const queryOrderBy = vi.fn()
const queryWhereScope = vi.fn()
const queryWhereUser = vi.fn()
const collectionDocSet = vi.fn()
const collectionDoc = vi.fn()
const collection = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
  FirebaseAuthorizationError: class FirebaseAuthorizationError extends Error {
    statusCode = 401
  },
}))

function createFirestoreStub() {
  queryGet.mockResolvedValue({
    docs: [
      {
        id: "comment-1",
        data: () => ({
          commentId: "comment-1",
          userId: "user-1",
          schoolId: null,
          commentText: "Shows steady effort and contributes thoughtfully in discussion.",
          categories: ["effort", "participation"],
          createdAt: "2026-03-16T12:00:00.000Z",
          updatedAt: "2026-03-16T12:00:00.000Z",
        }),
      },
    ],
  })
  queryLimit.mockImplementation(() => ({
    get: queryGet,
  }))
  queryOrderBy.mockImplementation(() => ({
    limit: queryLimit,
  }))
  queryWhereScope.mockImplementation(() => ({
    orderBy: queryOrderBy,
  }))
  queryWhereUser.mockImplementation(() => ({
    where: queryWhereScope,
  }))
  collectionDocSet.mockResolvedValue(undefined)
  collectionDoc.mockImplementation(() => ({
    set: collectionDocSet,
  }))
  collection.mockImplementation(() => ({
    where: queryWhereUser,
    doc: collectionDoc,
  }))

  return {
    collection,
  }
}

describe("/api/comment-bank", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "user-1",
      firestore: createFirestoreStub(),
    } as never)
  })

  it("returns the authenticated user's personal comment bank entries", async () => {
    const response = await GET(new Request("https://example.com/api/comment-bank?limit=20"))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.comments[0]).toMatchObject({
      commentId: "comment-1",
      userId: "user-1",
      schoolId: null,
      categories: ["effort", "participation"],
    })
    expect(queryWhereUser).toHaveBeenCalledWith("userId", "==", "user-1")
    expect(queryWhereScope).toHaveBeenCalledWith("libraryScope", "==", "personal")
  })

  it("saves a personal comment bank record with nullable school id", async () => {
    const response = await POST(
      new Request("https://example.com/api/comment-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentText: "Uses evidence well and writes with growing confidence.",
          categories: ["literacy", "progress"],
        }),
      }),
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(collectionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        schoolId: null,
        libraryScope: "personal",
        commentText: "Uses evidence well and writes with growing confidence.",
        categories: ["literacy", "progress"],
      }),
    )
  })
})
