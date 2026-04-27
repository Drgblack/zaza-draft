// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import type React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { UserMenu } from "@/components/user-menu"

const pushMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

vi.mock("@/hooks/use-teacher-prefs", () => ({
  useTeacherPrefs: () => ({
    prefs: {
      firstName: "Dora",
      profilePhoto: null,
    },
  }),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    t: (key: string) =>
      (
        {
          "account.menu.userMenu": "Account menu",
          "account.menu.accountSettings": "Account settings",
          "account.menu.myData": "My data / Export",
          "account.menu.privacySafety": "Privacy & safety",
          "account.menu.helpSupport": "Help / Support",
          "account.menu.adminDashboard": "Admin dashboard",
          "account.menu.adminUsers": "Admin users",
          "userMenu.adminLicences": "Admin licences",
          "account.menu.logout": "Log out",
        } as Record<string, string>
      )[key] ?? key,
  }),
}))

describe("UserMenu admin link", () => {
  beforeEach(() => {
    pushMock.mockReset()
    useAuthMock.mockReset()
  })

  it("shows the Admin dashboard link for super_admin", () => {
    useAuthMock.mockReturnValue({
      user: { displayName: "Dora", email: "dora@example.com", photoURL: null },
      role: "super_admin",
      signOut: vi.fn(),
    })

    render(<UserMenu />)

    expect(screen.getByText("Admin dashboard")).toBeInTheDocument()
    expect(screen.getByText("Admin users")).toBeInTheDocument()
    expect(screen.getByText("Admin licences")).toBeInTheDocument()
  })

  it("hides the Admin dashboard link for teacher", () => {
    useAuthMock.mockReturnValue({
      user: { displayName: "Dora", email: "dora@example.com", photoURL: null },
      role: "teacher",
      signOut: vi.fn(),
    })

    render(<UserMenu />)

    expect(screen.queryByText("Admin dashboard")).toBeNull()
    expect(screen.queryByText("Admin users")).toBeNull()
    expect(screen.queryByText("Admin licences")).toBeNull()
  })

  it("hides the Admin dashboard link for teacher_free", () => {
    useAuthMock.mockReturnValue({
      user: { displayName: "Dora", email: "dora@example.com", photoURL: null },
      role: "teacher_free",
      signOut: vi.fn(),
    })

    render(<UserMenu />)

    expect(screen.queryByText("Admin dashboard")).toBeNull()
    expect(screen.queryByText("Admin users")).toBeNull()
    expect(screen.queryByText("Admin licences")).toBeNull()
  })
})
