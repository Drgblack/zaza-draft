import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: vi.fn(async () => ({})),
      }),
    }),
  }),
}))

describe("/api/health", () => {
  it("returns ok true when firebase responds", async () => {
    const { GET } = await import("../route")
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.firebaseOk).toBe(true)
  })
})
