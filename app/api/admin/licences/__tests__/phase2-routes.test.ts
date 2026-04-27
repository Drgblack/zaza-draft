import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET as listLicencesRoute, POST as createLicenceRoute } from "@/app/api/admin/licences/route"
import { GET as licenceDetailRoute, PATCH as patchLicenceRoute } from "@/app/api/admin/licences/[licenceId]/route"
import { POST as addLicenceMemberRoute } from "@/app/api/admin/licences/[licenceId]/members/route"
import { DELETE as removeLicenceMemberRoute } from "@/app/api/admin/licences/[licenceId]/members/[uid]/route"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockAuthorizeAdminRequest = vi.fn()
const mockAssertZazaDraftProject = vi.fn()
const mockCreateSchoolAndLicence = vi.fn()
const mockUpdateSchoolAndLicence = vi.fn()
const mockAssignUserToLicence = vi.fn()
const mockRemoveUserFromLicence = vi.fn()

vi.mock("@/lib/admin/api-auth", () => ({
  authorizeAdminRequest: (...args: unknown[]) => mockAuthorizeAdminRequest(...args),
}))

vi.mock("@/lib/admin/licences", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/licences")>(
    "@/lib/admin/licences",
  )
  return {
    ...actual,
    createSchoolAndLicence: (...args: unknown[]) => mockCreateSchoolAndLicence(...args),
    updateSchoolAndLicence: (...args: unknown[]) => mockUpdateSchoolAndLicence(...args),
    assignUserToLicence: (...args: unknown[]) => mockAssignUserToLicence(...args),
    removeUserFromLicence: (...args: unknown[]) => mockRemoveUserFromLicence(...args),
  }
})

vi.mock("@/lib/firebase/project-policy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/firebase/project-policy")>(
    "@/lib/firebase/project-policy",
  )
  return {
    ...actual,
    assertZazaDraftProject: (...args: unknown[]) => mockAssertZazaDraftProject(...args),
  }
})

function createSnapshot(id: string, data: Record<string, unknown> | null) {
  return {
    id,
    exists: data !== null,
    data: () => data,
  }
}

function createFirestore(options?: {
  schools?: Record<string, Record<string, unknown>>
  licences?: Record<string, Record<string, unknown>>
  memberships?: Record<string, Record<string, unknown>>
  users?: Record<string, Record<string, unknown>>
  profiles?: Record<string, Record<string, unknown>>
}) {
  const schools = options?.schools ?? {}
  const licences = options?.licences ?? {}
  const memberships = options?.memberships ?? {}
  const users = options?.users ?? {}
  const profiles = options?.profiles ?? {}

  return {
    collection: (name: string) => ({
      get: vi.fn(async () => {
        if (name === "schools") {
          return {
            docs: Object.entries(schools).map(([id, data]) => ({ id, data: () => data })),
          }
        }
        if (name === "licences") {
          return {
            docs: Object.entries(licences).map(([id, data]) => ({ id, data: () => data })),
          }
        }
        if (name === "school_memberships") {
          return {
            docs: Object.entries(memberships).map(([id, data]) => ({ id, data: () => data })),
          }
        }
        return { docs: [] }
      }),
      doc: (id: string) => ({
        get: vi.fn(async () => {
          if (name === "schools") {
            return createSnapshot(id, schools[id] ?? null)
          }
          if (name === "licences") {
            return createSnapshot(id, licences[id] ?? null)
          }
          if (name === "users") {
            return createSnapshot(id, users[id] ?? null)
          }
          if (name === "user_profiles") {
            return createSnapshot(id, profiles[id] ?? null)
          }
          return createSnapshot(id, null)
        }),
      }),
      where: (field: string, _operator: string, value: string) => ({
        get: vi.fn(async () => {
          if (name !== "school_memberships" || field !== "licenceId") {
            return { docs: [] }
          }

          return {
            docs: Object.entries(memberships)
              .filter(([, data]) => data.licenceId === value)
              .map(([id, data]) => ({ id, data: () => data })),
          }
        }),
      }),
    }),
  }
}

function createAuthResult(firestore = createFirestore()) {
  return {
    ok: true as const,
    uid: "super-admin",
    firestore,
    auth: {
      getUser: vi.fn(async (uid: string) => ({
        uid,
        email: `${uid}@example.com`,
      })),
    },
    role: "super_admin" as const,
  }
}

describe("Phase 2 admin licence routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
    mockCreateSchoolAndLicence.mockResolvedValue({
      schoolId: "school-1",
      licenceId: "licence-1",
    })
    mockUpdateSchoolAndLicence.mockResolvedValue(undefined)
    mockAssignUserToLicence.mockResolvedValue({
      alreadyAssigned: false,
      schoolId: "school-1",
    })
    mockRemoveUserFromLicence.mockResolvedValue(undefined)
  })

  it("POST /api/admin/licences returns school and licence ids", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(createAuthResult())

    const response = await createLicenceRoute(
      new Request("https://app.zazadraft.com/api/admin/licences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: "North High",
          contactEmail: "admin@north.example",
          domains: ["north.example"],
          licenceType: "school",
          seatLimit: 15,
          status: "active",
          startDate: 100,
          endDate: 200,
          notes: "pilot",
        }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      schoolId: "school-1",
      licenceId: "licence-1",
    })
    expect(mockCreateSchoolAndLicence).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUid: "super-admin",
        input: expect.objectContaining({
          schoolName: "North High",
          contactEmail: "admin@north.example",
          seatLimit: 15,
        }),
      }),
    )
  })

  it("GET /api/admin/licences returns a paginated list with active member counts", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(
      createAuthResult(
        createFirestore({
          schools: {
            "school-1": {
              schoolName: "North High",
              contactEmail: "admin@north.example",
              domains: ["north.example"],
              notes: "pilot",
            },
          },
          licences: {
            "licence-1": {
              schoolId: "school-1",
              licenceType: "school",
              seatLimit: 20,
              seatsUsed: 2,
              status: "active",
              startDate: 200,
              endDate: 400,
            },
          },
          memberships: {
            "teacher-1": {
              schoolId: "school-1",
              licenceId: "licence-1",
              assignedAt: 300,
              assignedBy: "super-admin",
              status: "active",
            },
            "teacher-2": {
              schoolId: "school-1",
              licenceId: "licence-1",
              assignedAt: 310,
              assignedBy: "super-admin",
              status: "removed",
            },
          },
        }),
      ),
    )

    const response = await listLicencesRoute(
      new Request("https://app.zazadraft.com/api/admin/licences?page=1&pageSize=10"),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      page: 1,
      totalPages: 1,
      items: [
        expect.objectContaining({
          licenceId: "licence-1",
          schoolName: "North High",
          seatsUsed: 2,
          seatLimit: 20,
          memberCount: 1,
        }),
      ],
    })
  })

  it("GET /api/admin/licences/:licenceId returns school, licence, and member rows", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(
      createAuthResult(
        createFirestore({
          schools: {
            "school-1": {
              schoolName: "North High",
              contactEmail: "admin@north.example",
              domains: ["north.example"],
              notes: "pilot",
              seatLimit: 20,
              seatsUsed: 1,
              status: "active",
              startDate: 200,
              endDate: 400,
              licenceType: "school",
            },
          },
          licences: {
            "licence-1": {
              schoolId: "school-1",
              licenceType: "school",
              seatLimit: 20,
              seatsUsed: 1,
              status: "active",
              startDate: 200,
              endDate: 400,
            },
          },
          memberships: {
            "teacher-1": {
              schoolId: "school-1",
              licenceId: "licence-1",
              assignedAt: 300,
              assignedBy: "super-admin",
              status: "active",
            },
          },
          users: {
            "teacher-1": {
              email: "teacher@example.com",
            },
          },
          profiles: {
            "teacher-1": {
              email: "teacher@example.com",
              role: "teacher",
            },
          },
        }),
      ),
    )

    const response = await licenceDetailRoute(
      new Request("https://app.zazadraft.com/api/admin/licences/licence-1"),
      { params: Promise.resolve({ licenceId: "licence-1" }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      school: expect.objectContaining({
        id: "school-1",
        schoolName: "North High",
      }),
      licence: expect.objectContaining({
        id: "licence-1",
      }),
      members: [
        expect.objectContaining({
          uid: "teacher-1",
          email: "teacher@example.com",
          role: "teacher",
          status: "active",
        }),
      ],
    })
  })

  it("PATCH /api/admin/licences/:licenceId maps the seat-limit validation error", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(createAuthResult())
    mockUpdateSchoolAndLicence.mockRejectedValueOnce(new Error("SEAT_LIMIT_BELOW_USAGE"))

    const response = await patchLicenceRoute(
      new Request("https://app.zazadraft.com/api/admin/licences/licence-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatLimit: 1 }),
      }),
      { params: Promise.resolve({ licenceId: "licence-1" }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "SEAT_LIMIT_BELOW_USAGE" },
    })
  })

  it("POST /api/admin/licences/:licenceId/members maps assignment conflicts", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(createAuthResult())
    mockAssignUserToLicence.mockRejectedValueOnce(new Error("SEAT_LIMIT_REACHED"))

    const response = await addLicenceMemberRoute(
      new Request("https://app.zazadraft.com/api/admin/licences/licence-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: "teacher-1" }),
      }),
      { params: Promise.resolve({ licenceId: "licence-1" }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "SEAT_LIMIT_REACHED" },
    })
  })

  it("POST /api/admin/licences/:licenceId/members rejects super_admin targets", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(createAuthResult())
    mockAssignUserToLicence.mockRejectedValueOnce(new Error("SUPER_ADMIN_PROTECTED"))

    const response = await addLicenceMemberRoute(
      new Request("https://app.zazadraft.com/api/admin/licences/licence-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: "teacher-1" }),
      }),
      { params: Promise.resolve({ licenceId: "licence-1" }) },
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "SUPER_ADMIN_PROTECTED" },
    })
  })

  it("POST /api/admin/licences/:licenceId/members rejects active memberships elsewhere", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(createAuthResult())
    mockAssignUserToLicence.mockRejectedValueOnce(new Error("USER_ALREADY_ASSIGNED"))

    const response = await addLicenceMemberRoute(
      new Request("https://app.zazadraft.com/api/admin/licences/licence-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: "teacher-1" }),
      }),
      { params: Promise.resolve({ licenceId: "licence-1" }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "USER_ALREADY_ASSIGNED" },
    })
  })

  it("DELETE /api/admin/licences/:licenceId/members/:uid returns success after removal", async () => {
    mockAuthorizeAdminRequest.mockResolvedValue(createAuthResult())

    const response = await removeLicenceMemberRoute(
      new Request("https://app.zazadraft.com/api/admin/licences/licence-1/members/teacher-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ licenceId: "licence-1", uid: "teacher-1" }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      licenceId: "licence-1",
      uid: "teacher-1",
    })
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementationOnce(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "GET /api/admin/licences",
      })
    })

    const response = await listLicencesRoute(
      new Request("https://app.zazadraft.com/api/admin/licences"),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
  })
})
