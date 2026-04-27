"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AdminNav } from "@/components/admin/admin-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"

type LicenceDetailResponse = {
  success: boolean
  school: {
    id: string
    schoolName: string
    contactEmail: string
    domains: string[]
    notes: string
    seatLimit: number
    seatsUsed: number
    status: "trial" | "active" | "expired" | "cancelled"
    startDate: number
    endDate: number
    licenceType: "school" | "district"
  }
  licence: {
    id: string
    schoolId: string
    licenceType: "school" | "district"
    seatLimit: number
    seatsUsed: number
    status: "trial" | "active" | "expired" | "cancelled"
    startDate: number
    endDate: number
  }
  members: Array<{
    uid: string
    email: string
    role: string
    assignedAt: number
    status: "active" | "removed"
  }>
}

function formatDate(timestamp: number) {
  return timestamp ? new Date(timestamp).toLocaleDateString() : "—"
}

export default function AdminLicenceDetailPage({ params }: { params: { licenceId: string } }) {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const [data, setData] = useState<LicenceDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [memberEmail, setMemberEmail] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    schoolName: "",
    contactEmail: "",
    notes: "",
    seatLimit: "0",
    status: "trial" as "trial" | "active" | "expired" | "cancelled",
    startDate: "",
    endDate: "",
  })
  const [reloadNonce, setReloadNonce] = useState(0)

  const loadData = useMemo(
    () => async () => {
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch(`/api/admin/licences/${params.licenceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error("Unable to load licence details.")
      }

      const payload = (await response.json()) as LicenceDetailResponse
      setData(payload)
      setForm({
        schoolName: payload.school.schoolName,
        contactEmail: payload.school.contactEmail,
        notes: payload.school.notes,
        seatLimit: String(payload.licence.seatLimit),
        status: payload.licence.status,
        startDate: payload.licence.startDate ? new Date(payload.licence.startDate).toISOString().slice(0, 10) : "",
        endDate: payload.licence.endDate ? new Date(payload.licence.endDate).toISOString().slice(0, 10) : "",
      })
    },
    [getIdToken, params.licenceId, router],
  )

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
        setLoading(true)
        setError(null)
        await loadData()
      } catch (loadError) {
        if (active) {
          setError((loadError as Error)?.message ?? "Unable to load licence details.")
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
  }, [loadData, reloadNonce, router, status])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch(`/api/admin/licences/${params.licenceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schoolName: form.schoolName,
          contactEmail: form.contactEmail,
          notes: form.notes,
          seatLimit: Number.parseInt(form.seatLimit, 10),
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate).getTime() : undefined,
          endDate: form.endDate ? new Date(form.endDate).getTime() : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Unable to update licence details.")
      }

      setSuccessMessage("Licence updated")
      setReloadNonce((current) => current + 1)
    } catch (saveError) {
      setError((saveError as Error)?.message ?? "Unable to update licence details.")
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    try {
      setAssigning(true)
      setError(null)
      setSuccessMessage(null)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const searchResponse = await fetch(`/api/admin/users?search=${encodeURIComponent(memberEmail)}&pageSize=5`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!searchResponse.ok) {
        throw new Error("Unable to search users.")
      }
      const searchPayload = (await searchResponse.json()) as { items?: Array<{ uid: string; email: string }> }
      const target = (searchPayload.items ?? []).find(
        (user) => user.email.toLowerCase() === memberEmail.trim().toLowerCase(),
      )
      if (!target) {
        throw new Error("No matching user found for that email.")
      }

      const response = await fetch(`/api/admin/licences/${params.licenceId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: target.uid }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to assign user to licence.")
      }

      setMemberEmail("")
      setSuccessMessage(payload?.alreadyAssigned ? "User already assigned" : "User assigned to licence")
      setReloadNonce((current) => current + 1)
    } catch (assignError) {
      setError((assignError as Error)?.message ?? "Unable to assign user to licence.")
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async (uid: string) => {
    try {
      setError(null)
      setSuccessMessage(null)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch(`/api/admin/licences/${params.licenceId}/members/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error("Unable to remove user from licence.")
      }

      setSuccessMessage("User removed from licence")
      setReloadNonce((current) => current + 1)
    } catch (removeError) {
      setError((removeError as Error)?.message ?? "Unable to remove user from licence.")
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Zaza Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Licence detail</h1>
          <p className="mt-2 text-sm text-slate-600">Review membership and seat usage.</p>
        </div>
        <AdminNav active="licences" />
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading licence...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">{error}</div>
      ) : data ? (
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{data.school.schoolName}</h2>
                <p className="mt-2 text-sm text-slate-600">{data.school.contactEmail}</p>
                <p className="mt-2 text-sm text-slate-600">Seats used: {data.licence.seatsUsed} / {data.licence.seatLimit}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p>Status: {data.licence.status}</p>
                <p>Start: {formatDate(data.licence.startDate)}</p>
                <p>End: {formatDate(data.licence.endDate)}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Input aria-label="School name" value={form.schoolName} onChange={(event) => setForm((current) => ({ ...current, schoolName: event.target.value }))} />
              <Input aria-label="Contact email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} />
              <Input aria-label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              <Input aria-label="Seat limit" value={form.seatLimit} onChange={(event) => setForm((current) => ({ ...current, seatLimit: event.target.value }))} />
              <select aria-label="Status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "trial" | "active" | "expired" | "cancelled" }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="trial">trial</option>
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="cancelled">cancelled</option>
              </select>
              <Input aria-label="Start date" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
              <Input aria-label="End date" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
            <div className="mt-4">
              <Button onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Members</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="member-email" className="mb-2 block text-sm font-medium text-slate-700">Add member by email</label>
                <Input id="member-email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="teacher@example.com" />
              </div>
              <Button onClick={() => void handleAssign()} disabled={assigning}>{assigning ? "Assigning..." : "Assign member"}</Button>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Assigned</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.members.map((member) => (
                    <tr key={member.uid}>
                      <td className="px-4 py-3 text-slate-900">{member.email || member.uid}</td>
                      <td className="px-4 py-3 text-slate-600">{member.role}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(member.assignedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{member.status}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => void handleRemove(member.uid)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
