// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminUsersPage from "@/app/admin/users/page"

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

function buildUsersResponse(users: Array<Record<string, unknown>>, meta?: { page?: number; total?: number; totalPages?: number }) {
  return {
    success: true,
    items: users,
    users,
    page: meta?.page ?? 1,
    pageSize: 25,
    total: meta?.total ?? users.length,
    totalPages: meta?.totalPages ?? 1,
  }
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    replaceMock.mockReset()
    getIdTokenMock.mockReset()
    useAuthMock.mockReset()
    getIdTokenMock.mockResolvedValue("firebase-token")
    useAuthMock.mockReturnValue({
      status: "authenticated",
      role: "super_admin",
      getIdToken: getIdTokenMock,
    })
  })

  it("submits the grant-pro request and shows a success message", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/users?")) {
        return {
          ok: true,
          json: async () =>
            buildUsersResponse([
              {
                uid: "teacher-uid",
                email: "teacher@example.com",
                role: "teacher",
                plan: "free",
                effectivePlan: "free",
                planStatus: "free",
                planReason: null,
                proReason: null,
                schoolId: null,
                schoolName: null,
                licenceStatus: null,
                createdAt: 1710000000000,
              },
            ]),
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
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "influencer" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Grant Pro" }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            url === "/api/admin/grant-pro" &&
            (options as RequestInit | undefined)?.method === "POST" &&
            (options as RequestInit | undefined)?.body ===
              JSON.stringify({ email: "teacher@example.com", reason: "influencer" }) &&
            (options as { headers?: Record<string, string> }).headers?.Authorization ===
              "Bearer firebase-token",
        ),
      ).toBe(true)
    })
    expect(await screen.findByText("Pro access granted")).toBeInTheDocument()
  })

  it("saves a plan change through the new admin users plan endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/users?")) {
        return {
          ok: true,
          json: async () =>
            buildUsersResponse([
              {
                uid: "teacher-uid",
                email: "teacher@example.com",
                role: "teacher",
                plan: "free",
                effectivePlan: "free",
                planStatus: "free",
                planReason: null,
                proReason: null,
                schoolId: null,
                schoolName: null,
                licenceStatus: null,
                createdAt: 1710000000000,
              },
            ]),
        } as Response
      }

      if (url === "/api/admin/users/plan") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            uid: "teacher-uid",
            plan: "pro",
            reason: "school pilot",
          }),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url} (${(init as RequestInit | undefined)?.method ?? "GET"})`)
    })

    render(<AdminUsersPage />)

    await screen.findByText("teacher@example.com")

    fireEvent.change(screen.getByLabelText("Effective plan for teacher@example.com"), {
      target: { value: "pro" },
    })
    fireEvent.change(screen.getByLabelText("Plan reason for teacher@example.com"), {
      target: { value: "school pilot" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            url === "/api/admin/users/plan" &&
            (options as RequestInit | undefined)?.method === "PATCH" &&
            (options as RequestInit | undefined)?.body ===
              JSON.stringify({
                targetUid: "teacher-uid",
                plan: "pro",
                reason: "school pilot",
              }),
        ),
      ).toBe(true)
    })

    expect(await screen.findByText("Plan updated")).toBeInTheDocument()
  })

  it("shows the plan reason in the table and shows an em dash for free users", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/users?")) {
        return {
          ok: true,
          json: async () =>
            buildUsersResponse([
              {
                uid: "pro-uid",
                email: "pro@example.com",
                role: "teacher",
                plan: "pro",
                effectivePlan: "pro",
                planStatus: "pro",
                planReason: "early supporter",
                proReason: "early supporter",
                schoolId: null,
                schoolName: null,
                licenceStatus: null,
                createdAt: 1710000000000,
              },
              {
                uid: "free-uid",
                email: "free@example.com",
                role: "teacher",
                plan: "free",
                effectivePlan: "free",
                planStatus: "free",
                planReason: null,
                proReason: null,
                schoolId: null,
                schoolName: null,
                licenceStatus: null,
                createdAt: 1710000000000,
              },
            ]),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<AdminUsersPage />)

    await screen.findByText("pro@example.com")
    expect(screen.getByDisplayValue("early supporter")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("sends search, filters, sort, and pagination through the API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/users?")) {
        const query = new URL(url, "https://app.zazadraft.com").searchParams
        const page = Number(query.get("page") ?? "1")
        return {
          ok: true,
          json: async () =>
            buildUsersResponse(
              [
                {
                  uid: `user-${page}`,
                  email: `teacher${page}@example.com`,
                  role: "teacher",
                  plan: "free",
                  effectivePlan: "free",
                  planStatus: "free",
                  planReason: null,
                  proReason: null,
                  schoolId: null,
                  schoolName: null,
                  licenceStatus: null,
                  createdAt: 1710000000000 + page,
                },
              ],
              { page, total: 30, totalPages: 2 },
            ),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<AdminUsersPage />)

    await screen.findByText("teacher1@example.com")

    fireEvent.change(screen.getByLabelText("Search users"), {
      target: { value: "greg" },
    })

    fireEvent.change(await screen.findByLabelText("Role filter"), {
      target: { value: "admin" },
    })

    fireEvent.change(await screen.findByLabelText("Plan filter"), {
      target: { value: "pro" },
    })

    fireEvent.change(await screen.findByLabelText("Sort by"), {
      target: { value: "email_asc" },
    })

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => {
          if (typeof url !== "string" || !url.startsWith("/api/admin/users?")) {
            return false
          }
          const params = new URL(url, "https://app.zazadraft.com").searchParams
          return (
            params.get("search") === "greg" &&
            params.get("role") === "admin" &&
            params.get("plan") === "pro" &&
            params.get("sort") === "email_asc" &&
            params.get("page") === "1"
          )
        }),
      ).toBe(true)
    })

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText("teacher2@example.com")).toBeInTheDocument())
  })

  it("shows the Licences nav link and renders school and licence columns", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : ""
      if (url.startsWith("/api/admin/users?")) {
        return {
          ok: true,
          json: async () =>
            buildUsersResponse([
              {
                uid: "teacher-uid",
                email: "teacher@example.com",
                role: "teacher",
                plan: "free",
                effectivePlan: "free",
                planStatus: "free",
                planReason: null,
                proReason: null,
                schoolId: "school-1",
                schoolName: "North High",
                licenceStatus: "active",
                createdAt: 1710000000000,
              },
            ]),
        } as Response
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    render(<AdminUsersPage />)

    expect(await screen.findByText("teacher@example.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Licences" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "School" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Licence" })).toBeInTheDocument()
    expect(screen.getByText("North High")).toBeInTheDocument()
    expect(screen.getByText("active")).toBeInTheDocument()
  })
})
