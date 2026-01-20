"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useLocale } from "@/hooks/use-locale"

const PREFILL_KEY = "zazaDraftPrefill"

type ScanStatus = "processing" | "completed" | "failed"

interface PanicScanAnalysis {
  summary?: string | null
  emotionalInterpretation?: string | null
  professionalRisk?: string | null
  suggestedResponse?: string | null
}

interface ScanResponse {
  scanId: string
  status: ScanStatus
  extractedText?: string | null
  classification?: Record<string, number | string> | null
  analysis?: PanicScanAnalysis | null
  failureReason?: string | null
  processingTimeMs?: number | null
}

export default function PanicScanResultPage() {
  const router = useRouter()
  const params = useParams()
  const { status, getIdToken } = useAuth()
  const { t } = useLocale()
  const scanId = params?.scanId
  const [scan, setScan] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isCompleted = scan?.status === "completed"

  useEffect(() => {
    let cancelled = false

    async function fetchScan() {
      if (!scanId) {
        if (!cancelled) {
          setError(t("panicScanResultInvalidId"))
          setLoading(false)
        }
        return
      }

      try {
        const token = await getIdToken()
        if (!token) {
          throw new Error(t("panicScanResultAuthError"))
        }

        const response = await fetch(`/api/panic-scan/${scanId}/analysis`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || t("panicScanResultLoadError"))
        }

        if (!cancelled) {
          setScan(payload.data)
          setError(null)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : t("panicScanResultLoadError"))
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
  }, [scanId, getIdToken, t])

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

  const statusLabel = useMemo(() => {
    if (!scan?.status) {
      return null
    }
    if (scan.status === "processing") {
      return t("panicScanResultStatusProcessing")
    }
    if (scan.status === "completed") {
      return t("panicScanResultStatusReady")
    }
    return t("panicScanResultStatusFailed")
  }, [scan?.status, t])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-900 dark:text-white">{t("loading")}</p>
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

  const statusBadgeLabel = statusLabel ?? scan?.status ?? ""
  const professionalRiskLabel = scan?.analysis?.professionalRisk
  const suggestedResponseText =
    typeof scan?.analysis?.suggestedResponse === "string"
      ? scan.analysis.suggestedResponse.replaceAll("_", " ")
      : scan?.analysis?.suggestedResponse ?? ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-8">
        <Link href="/panic-scan" className="text-sm text-white/80 underline">
          {t("panicScanResultBackLink")}
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{t("panicScanResultTitle")}</h1>
          <p className="text-sm text-white/70">{t("panicScanResultDescription")}</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            {t("panicScanResultCheckingStatus")}
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
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    {t("panicScanResultStatusLabel")}
                  </p>
                  <p className="text-xl font-semibold">{statusLabel}</p>
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
                  {statusBadgeLabel}
                </span>
              </div>
              {scan.processingTimeMs && (
                <p className="text-xs text-white/50">
                  {t("panicScanResultProcessingTime", { ms: Math.round(scan.processingTimeMs) })}
                </p>
              )}
              {scan.failureReason && (
                <p className="text-sm text-rose-200">
                  {t("panicScanResultFailureLabel", { reason: scan.failureReason })}
                </p>
              )}
            </div>

            {scan.extractedText && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                  {t("panicScanResultExtractedTitle")}
                </p>
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
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {t("panicScanResultAnalysisTitle")}
                </p>
                <p className="text-sm text-white/80">{scan.analysis.summary ?? ""}</p>
                <p className="text-xs text-white/60">{scan.analysis.emotionalInterpretation ?? ""}</p>
                {professionalRiskLabel && (
                  <p className="text-sm text-white/70">
                    {t("panicScanResultProfessionalRisk", { risk: professionalRiskLabel })}
                  </p>
                )}
                {suggestedResponseText && (
                  <p className="text-sm text-white/70">
                    {t("panicScanResultSuggestedResponse", { response: suggestedResponseText })}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleUseDraft}
                disabled={!isCompleted}
                className="w-full bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#c026d3] text-white"
              >
                {t("panicScanResultHelpButton")}
              </Button>
              <p className="text-xs text-white/60">{t("panicScanResultHelpNote")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
