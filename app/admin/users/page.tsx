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
  effectivePlan?: string
  planStatus: string
  proReason: string | null
  schoolId: string | null
  createdAt: number
}

type PlanOption = "free" | "pro"
type ProReasonOption =
  | "manual upgrade"
  | "influencer"
  | "test user"
  | "school pilot"
  | "early supporter"
  | "other"

const ROLE_OPTIONS: Exclude<ZazaRole, "super_admin">[] = [
  "admin",
  "school_admin",
  "teacher",
  "teacher_free",
]

const PLAN_OPTIONS: PlanOption[] = ["free", "pro"]
const PRO_REASON_OPTIONS: ProReasonOption[] = [
  "manual upgrade",
  "influencer",
  "test user",
  "school pilot",
  "early supporter",
  "other",
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

function normalisePlan(plan: string | undefined): PlanOption {
  return plan === "pro" ? "pro" : "free"
}

function normaliseReason(reason: string | null | undefined) {
  const normalized = reason?.trim()
  return normalized || "manual upgrade"
}

function resolveReasonOption(reason: string | null | undefined): ProReasonOption {
  const normalized = normaliseReason(reason)
  return PRO_REASON_OPTIONS.includes(normalized as ProReasonOption)
    ? (normalized as ProReasonOption)
    : "other"
}

function resolveReasonText(option: string | undefined, customReason: string | undefined, fallbackReason?: string | null) {
  if (option === "other") {
    const normalizedCustomReason = customReason?.trim()
    return normalizedCustomReason || normaliseReason(fallbackReason)
  }

  return option?.trim() || normaliseReason(fallbackReason)
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Exclude<ZazaRole, "super_admin">>>({})
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanOption>>({})
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, ProReasonOption>>({})
  const [customReasonDrafts, setCustomReasonDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingUid, setSavingUid] = useState<string | null>(null)
  const [grantEmail, setGrantEmail] = useState("")
  const [grantCustomReason, setGrantCustomReason] = useState("")
  const [grantReason, setGrantReason] = useState<ProReasonOption>("manual upgrade")
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
        setPlanDrafts(
          Object.fromEntries(
            usersPayload.users.map((user: AdminUser) => [
              user.uid,
              normalisePlan(user.effectivePlan ?? user.plan),
            ]),
          ),
        )
        setReasonDrafts(
          Object.fromEntries(
            usersPayload.users.map((user: AdminUser) => [user.uid, resolveReasonOption(user.proReason)]),
          ),
        )
        setCustomReasonDrafts(
          Object.fromEntries(
            usersPayload.users.map((user: AdminUser) => [
              user.uid,
              resolveReasonOption(user.proReason) === "other" ? user.proReason ?? "" : "",
            ]),
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

  const handleSaveUser = async (targetUid: string) => {
    try {
      setSavingUid(targetUid)
      setError(null)
      setSuccessMessage(null)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const userRecord = users.find((user) => user.uid === targetUid)
      if (!userRecord) {
        throw new Error("Could not update this user. Please try again or check their profile.")
      }

      const nextRole = roleDrafts[targetUid] ?? userRecord.role
      const nextPlan = planDrafts[targetUid] ?? normalisePlan(userRecord.effectivePlan ?? userRecord.plan)
      const nextReasonOption = reasonDrafts[targetUid] ?? resolveReasonOption(userRecord.proReason)
      const nextReason = resolveReasonText(
        nextReasonOption,
        customReasonDrafts[targetUid],
        userRecord.proReason,
      )
      const roleChanged = nextRole !== userRecord.role
      const planChanged = nextPlan !== normalisePlan(userRecord.effectivePlan ?? userRecord.plan)
      const reasonChanged =
        nextPlan === "pro" &&
        nextReason !== normaliseReason(userRecord.proReason)

      if (!roleChanged && !planChanged && !reasonChanged) {
        setSuccessMessage("No changes to save")
        return
      }

      if (roleChanged) {
        const roleResponse = await fetch("/api/admin/users/role", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetUid,
            newRole: nextRole,
          }),
        })

        if (!roleResponse.ok) {
          throw new Error("Could not update this user. Please try again or check their profile.")
        }
      }

      if (planChanged || reasonChanged) {
        const planResponse = await fetch("/api/admin/set-plan", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: userRecord.email,
            plan: nextPlan,
            reason: nextPlan === "pro" ? nextReason : undefined,
          }),
        })

        if (!planResponse.ok) {
          throw new Error("Could not update this user. Please try again or check their profile.")
        }
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.uid === targetUid
            ? {
                ...user,
                role: nextRole,
                plan: nextPlan,
                effectivePlan: nextPlan,
                planStatus: nextPlan,
                proReason: nextPlan === "pro" ? nextReason : null,
              }
            : user,
        ),
      )
      setSuccessMessage(planChanged ? "Plan updated" : "Role updated")
    } catch (saveError) {
      setError(
        (saveError as Error)?.message ??
          "Could not update this user. Please try again or check their profile.",
      )
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
        body: JSON.stringify({
          email: grantEmail,
          reason: resolveReasonText(grantReason, grantCustomReason, "manual upgrade"),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to grant Pro access.")
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.email.toLowerCase() === grantEmail.trim().toLowerCase()
            ? {
                ...user,
                plan: "pro",
                effectivePlan: "pro",
                planStatus: "pro",
                proReason: resolveReasonText(grantReason, grantCustomReason, "manual upgrade"),
              }
            : user,
        ),
      )
      setPlanDrafts((current) => {
        const matchingUser = users.find(
          (user) => user.email.toLowerCase() === grantEmail.trim().toLowerCase(),
        )
        return matchingUser ? { ...current, [matchingUser.uid]: "pro" } : current
      })
      setReasonDrafts((current) => {
        const matchingUser = users.find(
          (user) => user.email.toLowerCase() === grantEmail.trim().toLowerCase(),
        )
        return matchingUser
          ? {
              ...current,
              [matchingUser.uid]: resolveReasonOption(
                resolveReasonText(grantReason, grantCustomReason, "manual upgrade"),
              ),
            }
          : current
      })
      setCustomReasonDrafts((current) => {
        const matchingUser = users.find(
          (user) => user.email.toLowerCase() === grantEmail.trim().toLowerCase(),
        )
        return matchingUser
          ? {
              ...current,
              [matchingUser.uid]:
                grantReason === "other"
                  ? resolveReasonText(grantReason, grantCustomReason, "manual upgrade")
                  : "",
            }
          : current
      })
      setGrantEmail("")
      setGrantReason("manual upgrade")
      setGrantCustomReason("")
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
            <p className="mt-2 text-xs text-slate-500">
              You can upgrade or downgrade users below.
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
              <div className="sm:w-52">
                <label htmlFor="grant-pro-reason" className="mb-2 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <select
                  id="grant-pro-reason"
                  value={grantReason}
                  onChange={(event) => setGrantReason(event.target.value as ProReasonOption)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {PRO_REASON_OPTIONS.map((reasonOption) => (
                    <option key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </option>
                  ))}
                </select>
                {grantReason === "other" ? (
                  <Input
                    className="mt-2"
                    placeholder="Custom reason"
                    value={grantCustomReason}
                    onChange={(event) => setGrantCustomReason(event.target.value)}
                  />
                ) : null}
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
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Users may appear here from Firebase Auth, app user records, or admin profiles.
            </div>
            {successMessage ? (
              <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">UID</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
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
                    <td className="px-4 py-3">
                      {user.role === "super_admin" ? (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                            normalisePlan(user.effectivePlan ?? user.plan) === "pro"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {normalisePlan(user.effectivePlan ?? user.plan)}
                        </span>
                      ) : (
                        <select
                          value={planDrafts[user.uid] ?? normalisePlan(user.effectivePlan ?? user.plan)}
                          onChange={(event) =>
                            setPlanDrafts((current) => ({
                              ...current,
                              [user.uid]: event.target.value as PlanOption,
                            }))
                          }
                          className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                            (planDrafts[user.uid] ?? normalisePlan(user.effectivePlan ?? user.plan)) === "pro"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {PLAN_OPTIONS.map((planOption) => (
                            <option key={planOption} value={planOption}>
                              {planOption}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.role === "super_admin" ? (
                        normalisePlan(user.effectivePlan ?? user.plan) === "pro" ? user.proReason || "—" : "—"
                      ) : (planDrafts[user.uid] ?? normalisePlan(user.effectivePlan ?? user.plan)) === "pro" ? (
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <select
                            aria-label={`Reason for ${user.email || user.uid}`}
                            value={reasonDrafts[user.uid] ?? resolveReasonOption(user.proReason)}
                            onChange={(event) =>
                              setReasonDrafts((current) => ({
                                ...current,
                                [user.uid]: event.target.value as ProReasonOption,
                              }))
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          >
                            {PRO_REASON_OPTIONS.map((reasonOption) => (
                              <option key={reasonOption} value={reasonOption}>
                                {reasonOption}
                              </option>
                            ))}
                          </select>
                          {(reasonDrafts[user.uid] ?? resolveReasonOption(user.proReason)) === "other" ? (
                            <Input
                              aria-label={`Custom reason for ${user.email || user.uid}`}
                              placeholder="Custom reason"
                              value={
                                customReasonDrafts[user.uid] ??
                                (resolveReasonOption(user.proReason) === "other" ? user.proReason ?? "" : "")
                              }
                              onChange={(event) =>
                                setCustomReasonDrafts((current) => ({
                                  ...current,
                                  [user.uid]: event.target.value,
                                }))
                              }
                            />
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {user.role === "super_admin" ? (
                        <span className="text-xs font-medium text-slate-500">Script only</span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void handleSaveUser(user.uid)}
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
