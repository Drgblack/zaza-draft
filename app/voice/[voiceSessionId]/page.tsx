"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"

const PREFILL_KEY = "zazaDraftPrefill"

interface VoiceSessionData {
  voiceSessionId: string
  status: "processing" | "completed" | "failed"
  transcribedText?: string | null
  emotionAnalysis?: {
    frustrationScore?: number
    urgencyScore?: number
    defensivenessScore?: number
    primaryEmotion?: string
    detectedNegativity?: boolean
  } | null
  failureReason?: string | null
}

interface SafeResponse {
  originalText: string
  safeVersion: string
  emotionReduction: {
    frustrationChange: string
    professionalImprovement: string
  }
  keyChanges: string[]
}

const TONE_OPTIONS = [
  { value: "empathetic", labelKey: "voiceSessionToneOptionEmpathetic" },
  { value: "professional", labelKey: "voiceSessionToneOptionProfessional" },
  { value: "calm", labelKey: "voiceSessionToneOptionCalm" },
]

const PRIMARY_BUTTON_CLASS =
  "w-full rounded-xl bg-indigo-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-black/40 transition duration-200 hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-slate-900 disabled:bg-indigo-600 disabled:text-white/70 disabled:cursor-not-allowed"

export default function VoiceSessionPage() {
  const router = useRouter()
  const params = useParams()
  const { status, getIdToken } = useAuth()
  const { t } = useLocale()
  const sessionId = params?.voiceSessionId
  const [session, setSession] = useState<VoiceSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetTone, setTargetTone] = useState("empathetic")
  const [preserveIntent, setPreserveIntent] = useState(true)
  const [safeResponse, setSafeResponse] = useState<SafeResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchSession() {
      if (!sessionId) {
        if (!cancelled) {
          setError(t("voiceSessionInvalidId"))
          setLoading(false)
        }
        return
      }

      try {
        const token = await getIdToken()
        if (!token) {
          throw new Error(t("voiceSessionAuthError"))
        }

        const response = await fetch(`/api/voice/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || t("voiceSessionLoadError"))
        }

        if (!cancelled) {
          setSession(payload.data)
          setError(null)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : t("voiceSessionLoadError"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchSession()
    const interval = window.setInterval(fetchSession, 4000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [sessionId, getIdToken, t])

  const statusLabel = useMemo(() => {
    if (!session?.status) {
      return null
    }
    if (session.status === "processing") {
      return t("voiceSessionStatusProcessing")
    }
    if (session.status === "completed") {
      return t("voiceSessionStatusCompleted")
    }
    return t("voiceSessionStatusFailed")
  }, [session?.status, t])

  const statusBadgeLabel = statusLabel ?? session?.status ?? ""

  const emotionMetrics = useMemo(
    () => [
      {
        labelKey: "voiceSessionMetricFrustration",
        value: session?.emotionAnalysis?.frustrationScore,
      },
      {
        labelKey: "voiceSessionMetricUrgency",
        value: session?.emotionAnalysis?.urgencyScore,
      },
      {
        labelKey: "voiceSessionMetricDefensiveness",
        value: session?.emotionAnalysis?.defensivenessScore,
      },
    ],
    [session?.emotionAnalysis],
  )

  const handleGenerate = async () => {
    if (!sessionId) return
    setIsGenerating(true)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error(t("voiceSessionAuthError"))
      }

      const response = await fetch(`/api/voice/${sessionId}/safe-rewrite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetTone,
          preserveIntent,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || t("voiceSessionRewriteError"))
      }

      setSafeResponse(payload.data)
    } catch (generationError) {
      setError(
        generationError instanceof Error ? generationError.message : t("voiceSessionRewriteError"),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseVersion = () => {
    if (safeResponse?.safeVersion) {
      sessionStorage.setItem(PREFILL_KEY, safeResponse.safeVersion)
      router.push("/")
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-8">
        <Link href="/voice" className="text-sm text-white/80 underline">
          {t("voiceSessionBackLink")}
        </Link>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{t("voiceSessionTitle")}</h1>
          <p className="text-sm text-white/70">{t("voiceSessionDescription")}</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            {t("voiceSessionChecking")}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/70 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {session && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {t("voiceSessionStatusLabel")}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    session.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-200"
                      : session.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-200"
                  }`}
                >
                  {statusBadgeLabel}
                </span>
              </div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{session.transcribedText}</p>
              {session.failureReason && (
                <p className="text-xs text-rose-200">
                  {t("voiceSessionFailureLabel", { reason: session.failureReason })}
                </p>
              )}
            </div>

            {session.emotionAnalysis && (
              <div className="grid gap-3 md:grid-cols-3">
                {emotionMetrics.map((metric) => (
                  <div key={metric.labelKey} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      {t(metric.labelKey)}
                    </p>
                    <p className="text-2xl font-semibold text-white">
                      {typeof metric.value === "number" ? metric.value.toFixed(0) : "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                {t("voiceSessionRewriteOptions")}
              </p>
              <div className="space-y-2 text-sm text-white/80">
                <label className="flex flex-col gap-1">
                  {t("voiceSessionTargetToneLabel")}
                  <select
                    className="rounded-xl bg-black/40 px-4 py-2 text-white focus:outline-none"
                    value={targetTone}
                    onChange={(event) => setTargetTone(event.target.value)}
                  >
                    {TONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={preserveIntent}
                    onChange={(event) => setPreserveIntent(event.target.checked)}
                  />
                  {t("voiceSessionPreserveIntent")}
                </label>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={session.status !== "completed" || isGenerating}
                className={PRIMARY_BUTTON_CLASS}
              >
                {isGenerating ? t("voiceSessionGenerating") : t("voiceSessionGenerateButton")}
              </Button>
            </div>

            {safeResponse && (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {t("voiceSessionSafeRewriteTitle")}
                </p>
                <div className="rounded-xl bg-white/10 p-4 text-sm text-white/80">
                  {safeResponse.safeVersion}
                </div>
                <div className="space-y-1 text-xs text-white/60">
                  <p>{t("voiceSessionKeyChangesLabel")}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {safeResponse.keyChanges.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleUseVersion} className={PRIMARY_BUTTON_CLASS}>
                    {t("voiceSessionUseVersionButton")}
                  </Button>
                  <p className="text-xs text-white/50">{t("voiceSessionFooterNote")}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
