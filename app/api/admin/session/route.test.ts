// @vitest-environment jsdom

import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminLoginPage from "@/app/admin/login/page"
import { GET, POST } from "@/app/api/admin/session/route"
import middleware, { shouldRequireAdminSession } from "@/middleware"
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/admin-session"
import { FirebaseProjectSafetyError } from "@/lib/firebase/project-policy"

const mockGetUserRole = vi.fn()
const mockGetFirebaseAdmin = vi.fn()
const mockSignInWithEmailAndPassword = vi.fn()
const mockSendPasswordResetEmail = vi.fn()
const mockSignOut = vi.fn()
const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockAssertZazaDraftProject = vi.fn()

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdmin: () => mockGetFirebaseAdmin(),
}))

vi.mock("@/lib/firebase/project-policy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/firebase/project-policy")>(
    "@/lib/firebase/project-policy",
  )
  return {
    ...actual,
    assertZazaDraftProject: (...args: unknown[]) => mockAssertZazaDraftProject(...args),
  }
})

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}))

vi.mock("@/lib/firebase/client", () => ({
  auth: { currentUser: null },
}))

function createRequest(body: Record<string, unknown>) {
  return new Request("https://app.zazadraft.com/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("/api/admin/session", () => {
  beforeEach(() => {
    mockGetUserRole.mockReset()
    mockGetFirebaseAdmin.mockReset()
    mockSignInWithEmailAndPassword.mockReset()
    mockSendPasswordResetEmail.mockReset()
    mockSignOut.mockReset()
    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockAssertZazaDraftProject.mockReset()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    mockAssertZazaDraftProject.mockReturnValue({
      projectId: "zaza-draft-app",
      overrideApplied: false,
    })
  })

  it("returns 200 with a session cookie for admins", async () => {
    const verifyIdToken = vi.fn(async () => ({ uid: "KJ8ZDQdeflRxSyy1BXwSFNA2dt2" }))
    const createSessionCookie = vi.fn(async () => "admin-session-cookie")

    mockGetFirebaseAdmin.mockReturnValue({
      auth: { verifyIdToken, createSessionCookie },
      firestore: {},
    })
    mockGetUserRole.mockResolvedValue("super_admin")

    const response = await POST(createRequest({ idToken: "valid-token" }))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE_NAME}=`)
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("Secure")
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=604800")
    expect(createSessionCookie).toHaveBeenCalledWith("valid-token", {
      expiresIn: 604800000,
    })
  })

  it("returns 403 with no cookie for non-admins", async () => {
    mockGetFirebaseAdmin.mockReturnValue({
      auth: {
        verifyIdToken: vi.fn(async () => ({ uid: "teacher-uid" })),
        createSessionCookie: vi.fn(async () => "should-not-be-used"),
      },
      firestore: {},
    })
    mockGetUserRole.mockResolvedValue("teacher")

    const response = await POST(createRequest({ idToken: "teacher-token" }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(payload.error.message).toBe("Insufficient permissions")
  })

  it("never redirects", async () => {
    mockGetFirebaseAdmin.mockReturnValue({
      auth: {
        verifyIdToken: vi.fn(async () => ({ uid: "teacher-uid" })),
        createSessionCookie: vi.fn(async () => "unused"),
      },
      firestore: {},
    })
    mockGetUserRole.mockResolvedValue("teacher")

    const getResponse = await GET()
    const postResponse = await POST(createRequest({ idToken: "teacher-token" }))

    expect([200, 400, 403]).toContain(getResponse.status)
    expect([200, 400, 403]).toContain(postResponse.status)
    expect([301, 302, 307, 308]).not.toContain(getResponse.status)
    expect([301, 302, 307, 308]).not.toContain(postResponse.status)
  })

  it("excludes /admin/login from the admin middleware check", () => {
    expect(shouldRequireAdminSession("/admin/login")).toBe(false)

    const request = new NextRequest("https://app.zazadraft.com/admin/login")
    const response = middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("waits for the session response before navigating", async () => {
    let resolveSession: ((value: Response) => void) | null = null
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveSession = resolve
        }),
    )
    vi.stubGlobal("fetch", fetchSpy)

    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: {
        getIdToken: vi.fn(async () => "firebase-id-token"),
      },
    })
    mockSignOut.mockResolvedValue(undefined)

    render(React.createElement(AdminLoginPage))

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "greg@zazatechnologies.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() =>
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledTimes(1),
    )
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeTruthy()
    expect(mockRouterPush).not.toHaveBeenCalled()

    resolveSession?.(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith("/admin/analytics"),
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/session",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    )
  })

  it("fails closed when Firebase points to the wrong project", async () => {
    mockAssertZazaDraftProject.mockImplementation(() => {
      throw new FirebaseProjectSafetyError("wrong project", {
        activeProjectId: "zaza-id-and-licences",
        expectedProjectId: "zaza-draft-app",
        context: "POST /api/admin/session",
      })
    })

    const response = await POST(createRequest({ idToken: "valid-token" }))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FIREBASE_PROJECT_MISMATCH" },
    })
    expect(mockGetFirebaseAdmin).not.toHaveBeenCalled()
  })

  it("sends a password reset email from the login page", async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined)

    render(React.createElement(AdminLoginPage))

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "greg@zazatechnologies.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }))

    await waitFor(() =>
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        "greg@zazatechnologies.com",
      ),
    )
    expect(
      screen.getByText("Password reset email sent to greg@zazatechnologies.com"),
    ).toBeTruthy()
  })
})
