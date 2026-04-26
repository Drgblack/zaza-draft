"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import type {
  AdminAnalyticsSummary,
  AnalyticsTimeframe,
  ProductFeedItem,
} from "@/lib/admin/analytics-dashboard"

type AnalyticsResponse = {
  summary: AdminAnalyticsSummary
  productDevelopmentFeed: ProductFeedItem[]
  viewer: {
    uid: string
    role: "super_admin" | "admin"
    schoolId: string | null
  }
}

const TIMEFRAME_OPTIONS: Array<{ value: AnalyticsTimeframe; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All time" },
]

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }
  return Math.round((numerator / denominator) * 100)
}

function prettyLevel(level: "high" | "medium" | "low") {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

function ProductBar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string
  value: number
  total: number
  colorClass: string
}) {
  const width = total > 0 ? `${(value / total) * 100}%` : "0%"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width }} />
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("7")
  const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null)
  const [viewer, setViewer] = useState<AnalyticsResponse["viewer"] | null>(null)
  const [feed, setFeed] = useState<ProductFeedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login")
      return
    }

    if (status !== "authenticated") {
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const token = await getIdToken()
        if (!token) {
          router.replace("/admin/login")
          return
        }

        const response = await fetch(`/api/admin/analytics/summary?days=${timeframe}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          redirect: "manual",
        })

        if (response.type === "opaqueredirect" || response.status === 307 || response.status === 302) {
          router.replace("/admin/login")
          return
        }

        if (!response.ok) {
          throw new Error("Unable to load admin analytics.")
        }

        const payload = (await response.json()) as AnalyticsResponse
        if (!active) {
          return
        }

        setSummary(payload.summary)
        setFeed(payload.productDevelopmentFeed)
        setViewer(payload.viewer)
      } catch (loadError) {
        if (active) {
          setError((loadError as Error)?.message ?? "Unable to load admin analytics.")
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
  }, [getIdToken, router, status, timeframe])

  const handleExport = async () => {
    try {
      setExporting(true)
      const token = await getIdToken()
      if (!token) {
        router.replace("/admin/login")
        return
      }

      const response = await fetch(`/api/admin/analytics/export?days=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "manual",
      })

      if (response.type === "opaqueredirect" || response.status === 307 || response.status === 302) {
        router.replace("/admin/login")
        return
      }

      if (!response.ok) {
        throw new Error("Unable to export analytics CSV.")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = `zaza-signals-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (exportError) {
      setError((exportError as Error)?.message ?? "Unable to export analytics CSV.")
    } finally {
      setExporting(false)
    }
  }

  const totalVerdicts =
    (summary?.qualityVerdictDistribution.already_strong ?? 0) +
    (summary?.qualityVerdictDistribution.improved ?? 0) +
    (summary?.qualityVerdictDistribution.needs_rewrite ?? 0)
  const totalTeacherActions =
    (summary?.teacherInteractionDistribution.accepted ?? 0) +
    (summary?.teacherInteractionDistribution.edited_minor ?? 0) +
    (summary?.teacherInteractionDistribution.edited_major ?? 0) +
    (summary?.teacherInteractionDistribution.discarded ?? 0)
  const totalRiskActions =
    (summary?.riskStripDistribution.viewed ?? 0) +
    (summary?.riskStripDistribution.ignored ?? 0) +
    (summary?.riskStripDistribution.caused_pause ?? 0) +
    (summary?.riskStripDistribution.caused_edit ?? 0)
  const acceptedRate = percent(summary?.teacherInteractionDistribution.accepted ?? 0, totalTeacherActions)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Zaza Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Analytics</h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {viewer?.role ?? "admin"}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as AnalyticsTimeframe)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900"
          >
            {TIMEFRAME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          {viewer?.role === "super_admin" ? (
            <Link href="/admin/users">
              <Button variant="secondary">Users</Button>
            </Link>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading analytics...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : summary ? (
        <div className="space-y-6">
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Section A
              </p>
              <h2 className="text-xl font-semibold text-slate-950">Generation Health</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Generation Success Rate</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {Math.round(summary.generationSuccessRate * 100)}%
                </p>
                <div className="mt-4 space-y-3">
                  <ProductBar
                    label="Primary model"
                    value={summary.generationOutcomeCounts.generated}
                    total={
                      summary.generationOutcomeCounts.generated +
                      summary.generationOutcomeCounts.fallback +
                      summary.generationOutcomeCounts.copyEditOnly
                    }
                    colorClass="bg-emerald-500"
                  />
                  <ProductBar
                    label="Fallback"
                    value={summary.generationOutcomeCounts.fallback}
                    total={
                      summary.generationOutcomeCounts.generated +
                      summary.generationOutcomeCounts.fallback +
                      summary.generationOutcomeCounts.copyEditOnly
                    }
                    colorClass="bg-amber-500"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Average Send Confidence Score</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {summary.avgSendConfidenceScore ?? "—"}
                </p>
                <div className="mt-4 space-y-3">
                  {(["high", "medium", "low"] as const).map((band) => (
                    <ProductBar
                      key={band}
                      label={prettyLevel(band)}
                      value={summary.sendConfidenceDistribution[band]}
                      total={
                        summary.sendConfidenceDistribution.high +
                        summary.sendConfidenceDistribution.medium +
                        summary.sendConfidenceDistribution.low
                      }
                      colorClass={
                        band === "high"
                          ? "bg-emerald-500"
                          : band === "medium"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Quality Verdict Distribution</p>
                <div className="mt-4 space-y-3">
                  <ProductBar
                    label="Already strong"
                    value={summary.qualityVerdictDistribution.already_strong}
                    total={totalVerdicts}
                    colorClass="bg-slate-500"
                  />
                  <ProductBar
                    label="Improved"
                    value={summary.qualityVerdictDistribution.improved}
                    total={totalVerdicts}
                    colorClass="bg-emerald-500"
                  />
                  <ProductBar
                    label="Needs rewrite"
                    value={summary.qualityVerdictDistribution.needs_rewrite}
                    total={totalVerdicts}
                    colorClass="bg-rose-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Section B
              </p>
              <h2 className="text-xl font-semibold text-slate-950">Teacher Trust Signals</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Draft Acceptance Rate</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{acceptedRate}%</p>
                <div className="mt-4 space-y-3">
                  <ProductBar label="Accepted" value={summary.teacherInteractionDistribution.accepted} total={totalTeacherActions} colorClass="bg-emerald-500" />
                  <ProductBar label="Edited minor" value={summary.teacherInteractionDistribution.edited_minor} total={totalTeacherActions} colorClass="bg-amber-400" />
                  <ProductBar label="Edited major" value={summary.teacherInteractionDistribution.edited_major} total={totalTeacherActions} colorClass="bg-amber-600" />
                  <ProductBar label="Discarded" value={summary.teacherInteractionDistribution.discarded} total={totalTeacherActions} colorClass="bg-rose-500" />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Send Confidence vs Teacher Action</p>
                <div className="mt-4 space-y-4">
                  {summary.sendConfidenceVsAction.map((row) => (
                    <div key={row.band} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>{prettyLevel(row.band)}</span>
                        <span className="font-medium">
                          Sent {row.sentCount} / Discarded {row.discardedCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Risk Strip Engagement</p>
                <div className="mt-4 space-y-3">
                  <ProductBar label="Viewed" value={summary.riskStripDistribution.viewed} total={totalRiskActions} colorClass="bg-slate-500" />
                  <ProductBar label="Ignored" value={summary.riskStripDistribution.ignored} total={totalRiskActions} colorClass="bg-rose-500" />
                  <ProductBar label="Caused pause" value={summary.riskStripDistribution.caused_pause} total={totalRiskActions} colorClass="bg-amber-500" />
                  <ProductBar label="Caused edit" value={summary.riskStripDistribution.caused_edit} total={totalRiskActions} colorClass="bg-emerald-500" />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Section C
              </p>
              <h2 className="text-xl font-semibold text-slate-950">Violation Intelligence</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Most Common Violations</p>
                <div className="mt-4 space-y-3">
                  {summary.topViolationCategories.length > 0 ? (
                    summary.topViolationCategories.map((violation) => (
                      <div key={violation.category} className="flex items-center justify-between text-sm text-slate-700">
                        <span>{violation.category}</span>
                        <span className="font-medium">
                          {violation.count} ({percent(violation.count, summary.topViolationCategories.reduce((sum, item) => sum + item.count, 0))}%)
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">No violation signals yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Violation → Teacher Action</p>
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">With violations</p>
                    <p className="mt-2">Accepted: {summary.violationActionCorrelation.withViolations.accepted}</p>
                    <p>Edited: {summary.violationActionCorrelation.withViolations.edited}</p>
                    <p>Discarded: {summary.violationActionCorrelation.withViolations.discarded}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">Without violations</p>
                    <p className="mt-2">Accepted: {summary.violationActionCorrelation.withoutViolations.accepted}</p>
                    <p>Edited: {summary.violationActionCorrelation.withoutViolations.edited}</p>
                    <p>Discarded: {summary.violationActionCorrelation.withoutViolations.discarded}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Section D
              </p>
              <h2 className="text-xl font-semibold text-slate-950">Product Development Feed</h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                {feed.length > 0 ? (
                  feed.map((item) => (
                    <div key={`${item.signalType}-${item.frequency}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-slate-950">{item.signalType}</p>
                        <p className="text-sm text-slate-500">Frequency: {item.frequency}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{item.productImplication}</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{item.suggestedAction}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No prioritised product signals in this timeframe.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
