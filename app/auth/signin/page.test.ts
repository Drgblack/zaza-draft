import { describe, expect, it, vi } from "vitest"

const redirectMock = vi.fn()

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}))

describe("LegacySignInPage", () => {
  it("redirects legacy sign-in links to /login and preserves search params", async () => {
    const pageModule = await import("./page")

    await pageModule.default({
      searchParams: Promise.resolve({
        next: "/account",
        mode: "resetPassword",
        oobCode: "abc123",
      }),
    })

    expect(redirectMock).toHaveBeenCalledWith(
      "/login?next=%2Faccount&mode=resetPassword&oobCode=abc123",
    )
  })
})
