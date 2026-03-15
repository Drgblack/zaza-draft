import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/snippets/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const queryGet = vi.fn()
const queryStartAfter = vi.fn()
const queryLimit = vi.fn()
const queryOrderBy = vi.fn()
const collection = vi.fn()
const doc = vi.fn()

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
        id: "snippet-1",
        data: () => ({
          generatedText: "doesn?fÃ¯Â¿Â½Ã¯Â¿Â½??sÃ¯Â¿Â½",
          tone: "professional",
          language: "en",
          wordCount: 12,
          contextUsed: {
            subject: "PrÃ¤sentationen",
          },
          createdAt: "2026-03-15T12:00:00.000Z",
        }),
      },
    ],
  })
  queryStartAfter.mockImplementation(() => ({ get: queryGet }))
  queryLimit.mockImplementation(() => ({
    get: queryGet,
    startAfter: queryStartAfter,
  }))
  queryOrderBy.mockImplementation(() => ({
    limit: queryLimit,
  }))
  collection.mockImplementation(() => ({
    orderBy: queryOrderBy,
  }))
  doc.mockImplementation(() => ({
    collection,
  }))

  return {
    collection: () => ({
      doc,
    }),
  }
}

describe("/api/snippets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "user-1",
      firestore: createFirestoreStub(),
    } as never)
  })

  it("sanitizes mojibake in stored snippet history before returning it", async () => {
    const request = new Request("https://example.com/api/snippets?limit=5")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data.snippets[0].generatedText).not.toContain("Ã")
    expect(json.data.snippets[0].generatedText).not.toContain("ï¿½")
    expect(json.data.snippets[0].generatedText).toContain("\uFFFD")
    expect(json.data.snippets[0].contextUsed.subject).toBe("Präsentationen")
  })
})
