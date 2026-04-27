// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AdminLicenceDetailPageClient } from "@/components/admin/admin-licence-detail-page"

const replaceMock = vi.fn()
const getIdTokenMock = vi.fn()
const useAuthMock = vi.fn()
const routerMock = {
  replace: replaceMock,
  push: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}))

function buildDetailResponse() {
  return {
    success: true,
    school: {
      id: "school-1",
      schoolName: "North High",
      contactEmail: "admin@north.example",
      domains: ["north.example"],
      notes: "pilot",
      seatLimit: 25,
      seatsUsed: 1,
      status: "active",
      startDate: 1710000000000,
      endDate: 1711000000000,
      licenceType: "school",
    },
    licence: {
      id: "licence-1",
      schoolId: "school-1",
      licenceType: "school",
      seatLimit: 25,
      seatsUsed: 1,
      status: "active",
      startDate: 1710000000000,
      endDate: 1711000000000,
    },
    members: [
      {
        uid: "teacher-1",
        email: "teacher@example.com",
        role: "teacher",
        assignedAt: 1710000000000,
        status: "active",
      },
      {
        uid: "teacher-2",
        email: "former@example.com",
        role: "teacher_free",
        assignedAt: 1710001000000,
        status: "removed",
      },
    ],
  }
}

describe("AdminLicenceDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    replaceMock.mockReset()
    getIdTokenMock.mockReset()
    useAuthMock.mockReset()
    getIdTokenMock.mockResolvedValue("firebase-token")
  })

  function renderPage() {
    render(<AdminLicenceDetailPageClient licenceId="licence-1" />)
  }

  it("renders members and management controls for super_admin", async () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      role: "super_admin",
      getIdToken: getIdTokenMock,
    })
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url === "/api/admin/licences/licence-1") {
        return {
          ok: true,
          json: async () => buildDetailResponse(),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    renderPage()

    await waitFor(() => expect(screen.getByText("teacher@example.com")).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText("North High")).toBeInTheDocument())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Assign member" })).toBeInTheDocument(),
    )
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument())
  })

  it("renders a read-only detail view for admin", async () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      role: "admin",
      getIdToken: getIdTokenMock,
    })
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url === "/api/admin/licences/licence-1") {
        return {
          ok: true,
          json: async () => buildDetailResponse(),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    renderPage()

    await waitFor(() => expect(screen.getByText("teacher@example.com")).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText("North High")).toBeInTheDocument())
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: "Assign member" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument()
  })
})
