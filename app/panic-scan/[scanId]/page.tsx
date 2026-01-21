"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useLocale } from "@/hooks/use-locale"
import { sanitizeCleanedMessage } from "@/lib/panic-scan/sanitize-cleaned-message"

const PREFILL_KEY = "zazaDraftPrefill"
const CLEAN_MESSAGE_COLLAPSE_THRESHOLD = 420

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
  extractedTextClean?: string | null
  cleanConfidence?: number | null
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
  const [cleanExpanded, setCleanExpanded] = useState(false)
  const [copiedCleanMessage, setCopiedCleanMessage] = useState(false)
  const copyTimeoutRef = useRef<number | null>(null)

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

  const handleUseDraft = () => {
    if (!displayedCleanMessage) {
      return
    }
    sessionStorage.setItem(PREFILL_KEY, displayedCleanMessage)
    router.push("/?panicScanReturn=1")
  }

  const statusBadgeLabel = statusLabel ?? scan?.status ?? ""
  const professionalRiskLabel = scan?.analysis?.professionalRisk
  const suggestedResponseText =
    typeof scan?.analysis?.suggestedResponse === "string"
      ? scan.analysis.suggestedResponse.replaceAll("_", " ")
      : scan?.analysis?.suggestedResponse ?? ""
  const cleanMessage = scan?.extractedTextClean ?? scan?.extractedText
  const showCleanConfidence = typeof scan?.cleanConfidence === "number"
  const displayConfidence = showCleanConfidence
    ? Math.round((scan?.cleanConfidence ?? 0) * 100)
    : null
  const sanitizedCleanMessage = useMemo(
    () => sanitizeCleanedMessage(cleanMessage),
    [cleanMessage],
  )
  const displayedCleanMessage = sanitizedCleanMessage || cleanMessage || ""
  const showCleanMessage = Boolean(displayedCleanMessage)
  const showLowConfidenceWarning =
    showCleanConfidence && (scan?.cleanConfidence ?? 0) < 0.5 && showCleanMessage
  const cleanMessageIsLong =
    showCleanMessage && displayedCleanMessage.length > CLEAN_MESSAGE_COLLAPSE_THRESHOLD

  useEffect(() => {
    setCleanExpanded(false)
  }, [cleanMessage])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleCopyCleanMessage = async () => {
    if (!displayedCleanMessage || typeof navigator === "undefined" || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(displayedCleanMessage)
      setCopiedCleanMessage(true)
      if (copyTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopiedCleanMessage(false), 2000)
    } catch (copyError) {
      console.error("[panic-scan] copy failed", copyError)
    }
  }
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
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950/90 via-slate-950/80 to-slate-900 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-6">
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
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/15 bg-white/5 px-6 py-6 space-y-3 shadow-[0_20px_60px_rgba(15,4,50,0.6)]">
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

            {displayedCleanMessage && (
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-6 py-5 space-y-4 shadow-[0_20px_60px_rgba(15,4,50,0.55)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                    {t("panicScanResultMessageLabel")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                    {displayConfidence !== null && (
                      <span className="font-semibold text-white">
                        {t("panicScanResultCleanConfidence", { confidence: displayConfidence })}
                      </span>
                    )}
                    <Button
                      onClick={handleCopyCleanMessage}
                      size="sm"
                      variant="outline"
                      className="text-xs uppercase tracking-[0.3em] border-white/40 bg-white/10 text-white/90 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0"
                    >
                      {t("panicScanResultCopyButton")}
                    </Button>
                    {copiedCleanMessage && (
                      <span className="text-xs text-emerald-200">Copied!</span>
                    )}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border border-white/5 bg-slate-900/70 p-4 text-sm text-white/90 whitespace-pre-wrap transition-[max-height] duration-200 overflow-y-auto ${
                    cleanExpanded ? "max-h-[900px]" : "max-h-80"
                  }`}
                >
                  {displayedCleanMessage}
                </div>
                {cleanMessageIsLong && (
                  <button
                    type="button"
                    onClick={() => setCleanExpanded((prev) => !prev)}
                    className="text-xs text-purple-200 underline transition hover:text-purple-100"
                  >
                    {cleanExpanded
                      ? t("panicScanResultCollapseLabel")
                      : t("panicScanResultExpandLabel")}
                  </button>
                )}
                {showLowConfidenceWarning && (
                  <p className="text-xs text-amber-200">
                    {t("panicScanResultCleanLowWarning")}
                  </p>
                )}
              </div>
            )}

            {scan.extractedText && (
              <details className="rounded-[28px] border border-white/15 bg-white/5 p-4">
                <summary className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  {t("panicScanResultRawLabel")}
                </summary>
                <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{scan.extractedText}</p>
                <p className="mt-2 text-xs text-slate-400">{t("panicScanResultRawSummary")}</p>
              </details>
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
              <div className="rounded-[28px] border border-white/15 bg-white/5 p-5 space-y-3 shadow-[0_20px_60px_rgba(15,4,50,0.45)]">
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

            <div className="space-y-2">
              <Button
                onClick={handleUseDraft}
                disabled={!isCompleted}
                className="w-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
              >
                {t("panicScanResultHelpButton")}
              </Button>
              <p className="text-xs text-slate-200">{t("panicScanResultHelpNote")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
