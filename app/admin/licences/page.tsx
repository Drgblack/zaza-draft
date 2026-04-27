"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AdminNav } from "@/components/admin/admin-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"

type LicenceListItem = {
  licenceId: string
  schoolId: string
  schoolName: string
  contactEmail: string
  domains: string[]
  notes: string
  licenceType: "school" | "district"
  seatLimit: number
  seatsUsed: number
  status: "trial" | "active" | "expired" | "cancelled"
  startDate: number
  endDate: number
  memberCount: number
}

type LicenceListResponse = {
  success: boolean
  items: LicenceListItem[]
  page: number
  totalPages: number
  total: number
}

function formatDate(timestamp: number) {
  return timestamp ? new Date(timestamp).toLocaleDateString() : "—"
}

export default function AdminLicencesPage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()

  const [items, setItems] = useState<LicenceListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [form, setForm] = useState({
    schoolName: "",
    contactEmail: "",
    domains: "",
    licenceType: "school" as "school" | "district",
    seatLimit: "25",
    status: "trial" as "trial" | "active" | "expired" | "cancelled",
    startDate: "",
    endDate: "",
    notes: "",
  })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("pageSize", "25")
    return params.toString()
  }, [page])

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
        const token = await getIdToken()
        if (!token) {
          router.replace("/admin/login")
          return
        }

        const response = await fetch(`/api/admin/licences?${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.status === 403) {
          router.replace("/admin/login")
          return
        }

        if (!response.ok) {
          throw new Error("Unable to load school licences.")
        }

        const payload = (await response.json()) as LicenceListResponse
        if (!active) {
          return
        }

        setItems(payload.items)
        setPage(payload.page)
        setTotalPages(payload.totalPages)
        setCanManage(true)
      } catch (loadError) {
        if (active) {
          setError((loadError as Error)?.message ?? "Unable to load school licences.")
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
  }, [getIdToken, queryString, router, status])

  const handleCreate = async () => {
    try {
      setCreating(true)
      setError(null)
      setSuccessMessage(null)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch("/api/admin/licences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          domains: form.domains.split(",").map((value) => value.trim()).filter(Boolean),
          seatLimit: Number.parseInt(form.seatLimit, 10),
          startDate: form.startDate ? new Date(form.startDate).getTime() : Date.now(),
          endDate: form.endDate ? new Date(form.endDate).getTime() : Date.now(),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to create school licence.")
      }

      setSuccessMessage("School licence created")
      setForm({
        schoolName: "",
        contactEmail: "",
        domains: "",
        licenceType: "school",
        seatLimit: "25",
        status: "trial",
        startDate: "",
        endDate: "",
        notes: "",
      })
      router.push(`/admin/licences/${payload.licenceId}`)
    } catch (createError) {
      setError((createError as Error)?.message ?? "Unable to create school licence.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Zaza Admin</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Licences</h1>
          <p className="mt-2 text-sm text-slate-600">Manage school and district licences.</p>
        </div>
        <AdminNav active="licences" canManageUsers={canManage} />
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Create school licence</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input aria-label="School name" placeholder="School name" value={form.schoolName} onChange={(event) => setForm((current) => ({ ...current, schoolName: event.target.value }))} />
          <Input aria-label="Contact email" placeholder="Contact email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} />
          <Input aria-label="Domains" placeholder="Domains (comma separated)" value={form.domains} onChange={(event) => setForm((current) => ({ ...current, domains: event.target.value }))} />
          <Input aria-label="Seat limit" placeholder="Seat limit" value={form.seatLimit} onChange={(event) => setForm((current) => ({ ...current, seatLimit: event.target.value }))} />
          <select aria-label="Licence type" value={form.licenceType} onChange={(event) => setForm((current) => ({ ...current, licenceType: event.target.value as "school" | "district" }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="school">school</option>
            <option value="district">district</option>
          </select>
          <select aria-label="Status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "trial" | "active" | "expired" | "cancelled" }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="trial">trial</option>
            <option value="active">active</option>
            <option value="expired">expired</option>
            <option value="cancelled">cancelled</option>
          </select>
          <Input aria-label="Start date" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
          <Input aria-label="End date" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
          <Input aria-label="Notes" placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
        <div className="mt-4">
          <Button onClick={() => void handleCreate()} disabled={creating}>
            {creating ? "Creating..." : "Create licence"}
          </Button>
        </div>
        {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading licences...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">School name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Seats</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.licenceId}>
                    <td className="px-4 py-3 text-slate-900">{item.schoolName}</td>
                    <td className="px-4 py-3 text-slate-600">{item.licenceType}</td>
                    <td className="px-4 py-3 text-slate-600">{item.seatsUsed} / {item.seatLimit}</td>
                    <td className="px-4 py-3 text-slate-600">{item.status}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.startDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.endDate)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/licences/${item.licenceId}`)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
