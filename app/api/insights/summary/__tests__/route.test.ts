import { describe, expect, it, vi } from "vitest"

const mockAuthorize = vi.fn()

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: mockAuthorize,
  FirebaseAuthorizationError: class extends Error {
    statusCode = 401
  },
}))

import { GET } from "@/app/api/insights/summary/route"

describe("insights summary route", () => {
  beforeEach(() => {
    mockAuthorize.mockReset()
  })

  it("returns summary data when the document exists", async () => {
    const summaryDoc = {
      get: vi.fn(async () => ({
        exists: true,
        data: () => ({ draftsCreated: 2, lastDraftAt: { seconds: 1, nanoseconds: 0 } }),
      })),
    }
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            doc: vi.fn(() => summaryDoc),
          })),
        })),
      })),
    }
    mockAuthorize.mockResolvedValue({ uid: "uid", firestore })

    const response = await GET(new Request("https://example.com"))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      success: true,
      data: {
        summary: {
          draftsCreated: 2,
          lastDraftAt: { seconds: 1, nanoseconds: 0 },
        },
      },
    })
  })

  it("returns null summary when no document", async () => {
    const summaryDoc = {
      get: vi.fn(async () => ({ exists: false })),
    }
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            doc: vi.fn(() => summaryDoc),
          })),
        })),
      })),
    }
    mockAuthorize.mockResolvedValue({ uid: "uid", firestore })

    const response = await GET(new Request("https://example.com"))
    const body = await response.json()
    expect(body).toEqual({
      success: true,
      data: {
        summary: null,
      },
    })
  })
})
