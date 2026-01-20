"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { AuthScreen } from "@/components/auth/auth-screen"

const PREFILL_KEY = "zazaDraftPrefill"

type ScanStatus = "processing" | "completed" | "failed"

interface ScanResponse {
  scanId: string
  status: ScanStatus
  extractedText?: string | null
  classification?: Record<string, any> | null
  analysis?: Record<string, any> | null
  failureReason?: string | null
  processingTimeMs?: number | null
}

export default function PanicScanResultPage() {
  const router = useRouter()
  const params = useParams()
  const { status, getIdToken } = useAuth()
  const scanId = params?.scanId
  const [scan, setScan] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isCompleted = scan?.status === "completed"
  const isFailed = scan?.status === "failed"

  useEffect(() => {
    let cancelled = false

    async function fetchScan() {
      if (!scanId) {
        if (!cancelled) {
          setError("Invalid scan identifier.")
          setLoading(false)
        }
        return
      }

      try {
        const token = await getIdToken()
        if (!token) {
          throw new Error("Sign in again to view this scan.")
        }
        const response = await fetch(`/api/panic-scan/${scanId}/analysis`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || "Unable to load scan.")
        }
        if (!cancelled) {
          setScan(payload.data)
          setError(null)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load scan.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchScan()
    const interval = window.setInterval(fetchScan, 4000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [scanId, getIdToken])

  const classificationList = useMemo(
    () =>
      scan?.classification
        ? Object.entries(scan.classification).map(([key, value]) => ({
            label: key,
            value: typeof value === "number" ? value.toFixed(0) : String(value),
          }))
        : [],
    [scan?.classification],
  )

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-900 dark:text-white">Loading.</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <AuthScreen />
  }

  const handleUseDraft = () => {
    if (scan?.extractedText) {
      sessionStorage.setItem(PREFILL_KEY, scan.extractedText)
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-8">
        <Link href="/panic-scan" className="text-sm text-white/80 underline">
          ← Upload another screenshot
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Panic Scan analysis</h1>
          <p className="text-sm text-white/70">
            Zaza Draft extracts the message, assesses emotional tone, and explains possible replies.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Checking the scan status…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-300/70 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {scan && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Status</p>
                  <p className="text-xl font-semibold">
                    {scan.status === "processing" && "Processing"}
                    {scan.status === "completed" && "Ready to reply"}
                    {scan.status === "failed" && "Failed"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    scan.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-200"
                      : scan.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-200"
                  }`}
                >
                  {scan.status}
                </span>
              </div>
              {scan.processingTimeMs && (
                <p className="text-xs text-white/50">
                  Processing time: {Math.round(scan.processingTimeMs)} ms
                </p>
              )}
              {scan.failureReason && (
                <p className="text-sm text-rose-200">Reason: {scan.failureReason}</p>
              )}
            </div>

            {scan.extractedText && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Extracted text</p>
                <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{scan.extractedText}</p>
              </div>
            )}

            {classificationList.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {classificationList.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60 uppercase tracking-[0.3em]">{item.label}</p>
                    <p className="text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {scan.analysis && (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/70 to-black/60 p-5 space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Analysis</p>
                <p className="text-sm text-white/80">{scan.analysis.summary}</p>
                <p className="text-xs text-white/60">{scan.analysis.emotionalInterpretation}</p>
                <p className="text-sm text-white/70">
                  Professional risk: {scan.analysis.professionalRisk}
                </p>
                <p className="text-sm text-white/70">
                  Suggested response: {scan.analysis.suggestedResponse.replaceAll("_", " ")}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleUseDraft}
                disabled={!isCompleted}
                className="w-full bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#c026d3] text-white"
              >
                Help me reply safely
              </Button>
              <p className="text-xs text-white/60">
                Clicking this will open the editor with the extracted message preloaded.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
