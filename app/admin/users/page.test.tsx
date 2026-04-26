// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminUsersPage from "@/app/admin/users/page"

const replaceMock = vi.fn()
const getIdTokenMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}))

describe("AdminUsersPage grant Pro action", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    replaceMock.mockReset()
    getIdTokenMock.mockReset()
    useAuthMock.mockReset()
    getIdTokenMock.mockResolvedValue("firebase-token")
    useAuthMock.mockReturnValue({
      status: "authenticated",
      getIdToken: getIdTokenMock,
    })
  })

  it("submits the grant-pro request and shows a success message", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url === "/api/admin/users") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            users: [
              {
                uid: "teacher-uid",
                email: "teacher@example.com",
                role: "teacher",
                planStatus: "free",
                schoolId: null,
                createdAt: 1710000000000,
              },
            ],
          }),
        } as Response
      }

      if (url === "/api/admin/grant-pro") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            uid: "teacher-uid",
          }),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<AdminUsersPage />)

    await screen.findByText("teacher@example.com")

    fireEvent.change(screen.getByLabelText("User email"), {
      target: { value: "teacher@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Grant Pro" }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            url === "/api/admin/grant-pro" &&
            (options as RequestInit | undefined)?.method === "POST" &&
            (options as RequestInit | undefined)?.body ===
              JSON.stringify({ email: "teacher@example.com" }) &&
            (options as RequestInit | undefined)?.headers &&
            (options as { headers?: Record<string, string> }).headers?.Authorization ===
              "Bearer firebase-token",
        ),
      ).toBe(true)
    })
    expect(await screen.findByText("Pro access granted")).toBeInTheDocument()
  })
})
