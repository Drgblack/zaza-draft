"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import type { ZazaRole } from "@/lib/auth/roles"

type AdminUser = {
  uid: string
  email: string
  role: ZazaRole
  plan: string
  planStatus: string
  schoolId: string | null
  createdAt: number
}

const ROLE_OPTIONS: Exclude<ZazaRole, "super_admin">[] = [
  "admin",
  "school_admin",
  "teacher",
  "teacher_free",
]

function formatDate(timestamp: number) {
  if (!timestamp) {
    return "—"
  }
  return new Date(timestamp).toLocaleDateString()
}

function truncateUid(uid: string) {
  if (uid.length <= 10) {
    return uid
  }
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Exclude<ZazaRole, "super_admin">>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingUid, setSavingUid] = useState<string | null>(null)
  const [grantEmail, setGrantEmail] = useState("")
  const [grantError, setGrantError] = useState<string | null>(null)
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null)
  const [grantingPro, setGrantingPro] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login")
      return
    }

    if (status !== "authenticated") {
      return
    }

    let active = true

    void (async () => {
      try {
        const token = await getIdToken()
        if (!token) {
          router.replace("/admin/login")
          return
        }

        const usersResponse = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (usersResponse.status === 403) {
          router.replace("/admin/analytics?error=super_admin_required")
          return
        }

        if (!usersResponse.ok) {
          throw new Error("Unable to load admin users.")
        }

        const usersPayload = await usersResponse.json()
        if (!active) {
          return
        }

        setUsers(usersPayload.users)
        setRoleDrafts(
          Object.fromEntries(
            usersPayload.users
              .filter((user: AdminUser) => user.role !== "super_admin")
              .map((user: AdminUser) => [user.uid, user.role]),
          ),
        )
      } catch (loadError) {
        if (active) {
          setError((loadError as Error)?.message ?? "Unable to load admin users.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [getIdToken, router, status])

  const handleSaveRole = async (targetUid: string) => {
    try {
      setSavingUid(targetUid)
      setError(null)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid,
          newRole: roleDrafts[targetUid],
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message ?? "Unable to save role.")
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.uid === targetUid ? { ...user, role: roleDrafts[targetUid] } : user,
        ),
      )
    } catch (saveError) {
      setError((saveError as Error)?.message ?? "Unable to save role.")
    } finally {
      setSavingUid(null)
    }
  }

  const handleGrantPro = async () => {
    try {
      setGrantingPro(true)
      setGrantError(null)
      setGrantSuccess(null)

      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch("/api/admin/grant-pro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: grantEmail }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to grant Pro access.")
      }

      setGrantEmail("")
      setGrantSuccess("Pro access granted")
    } catch (grantProError) {
      setGrantError((grantProError as Error)?.message ?? "Unable to grant Pro access.")
    } finally {
      setGrantingPro(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Zaza Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Users</h1>
          <p className="mt-2 text-sm text-slate-600">
            Super admin only. Assign internal and school roles here.
          </p>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="outline">Analytics</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="secondary">Users</Button>
          </Link>
        </nav>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading users...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Grant Pro access</h2>
            <p className="mt-2 text-sm text-slate-600">
              Upgrade a user by email with a manual Pro entitlement override.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="grant-pro-email" className="mb-2 block text-sm font-medium text-slate-700">
                  User email
                </label>
                <Input
                  id="grant-pro-email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={grantEmail}
                  onChange={(event) => setGrantEmail(event.target.value)}
                />
              </div>
              <Button onClick={() => void handleGrantPro()} disabled={grantingPro}>
                {grantingPro ? "Granting..." : "Grant Pro"}
              </Button>
            </div>
            {grantSuccess ? (
              <p className="mt-3 text-sm text-emerald-700">{grantSuccess}</p>
            ) : null}
            {grantError ? <p className="mt-3 text-sm text-rose-700">{grantError}</p> : null}
          </section>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">UID</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-4 py-3 text-slate-900">{user.email || "—"}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{truncateUid(user.uid)}</td>
                    <td className="px-4 py-3">
                      {user.role === "super_admin" ? (
                        <span className="font-medium text-slate-900">super_admin</span>
                      ) : (
                        <select
                          value={roleDrafts[user.uid] ?? user.role}
                          onChange={(event) =>
                            setRoleDrafts((current) => ({
                              ...current,
                              [user.uid]: event.target.value as Exclude<ZazaRole, "super_admin">,
                            }))
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {ROLE_OPTIONS.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {roleOption}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.plan || user.planStatus}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {user.role === "super_admin" ? (
                        <span className="text-xs font-medium text-slate-500">Script only</span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void handleSaveRole(user.uid)}
                          disabled={savingUid === user.uid}
                        >
                          {savingUid === user.uid ? "Saving..." : "Save"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
