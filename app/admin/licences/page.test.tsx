// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminLicencesPage from "@/app/admin/licences/page"

const replaceMock = vi.fn()
const pushMock = vi.fn()
const getIdTokenMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}))

function buildLicencesResponse() {
  return {
    success: true,
    items: [
      {
        licenceId: "licence-1",
        schoolId: "school-1",
        schoolName: "North High",
        contactEmail: "admin@north.example",
        domains: ["north.example"],
        notes: "pilot",
        licenceType: "school",
        seatLimit: 25,
        seatsUsed: 3,
        status: "active",
        startDate: 1710000000000,
        endDate: 1711000000000,
        memberCount: 3,
      },
    ],
    page: 1,
    pageSize: 25,
    total: 1,
    totalPages: 1,
  }
}

describe("AdminLicencesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    replaceMock.mockReset()
    pushMock.mockReset()
    getIdTokenMock.mockReset()
    useAuthMock.mockReset()
    getIdTokenMock.mockResolvedValue("firebase-token")
  })

  it("renders the licence list and create controls for super_admin", async () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      role: "super_admin",
      getIdToken: getIdTokenMock,
    })
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/licences?")) {
        return {
          ok: true,
          json: async () => buildLicencesResponse(),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<AdminLicencesPage />)

    await waitFor(() => expect(screen.getByText("North High")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Create licence" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument()
  })

  it("renders a read-only view for admin users", async () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      role: "admin",
      getIdToken: getIdTokenMock,
    })
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/licences?")) {
        return {
          ok: true,
          json: async () => buildLicencesResponse(),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<AdminLicencesPage />)

    await waitFor(() => expect(screen.getByText("North High")).toBeInTheDocument())
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Create licence" })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument()
  })
})
