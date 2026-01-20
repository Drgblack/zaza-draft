"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { AuthScreen } from "@/components/auth/auth-screen"

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

export default function VoiceSessionPage() {
  const router = useRouter()
  const params = useParams()
  const { status, getIdToken } = useAuth()
  const sessionId = params?.voiceSessionId
  const [session, setSession] = useState<VoiceSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetTone, setTargetTone] = useState("empathetic")
  const [preserveIntent, setPreserveIntent] = useState(true)
  const [safeResponse, setSafeResponse] = useState<SafeResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchSession = async () => {
    if (!sessionId) {
      setError("Invalid session identifier.")
      setLoading(false)
      return
    }

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Sign in again to continue.")
      }

      const response = await fetch(`/api/voice/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || "Unable to load session.")
      }

      setSession(payload.data)
      setError(null)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load session.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
    const interval = window.setInterval(fetchSession, 4000)
    return () => window.clearInterval(interval)
  }, [sessionId])

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

  const handleGenerate = async () => {
    if (!sessionId) return
    setIsGenerating(true)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Sign in again to continue.")
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
        throw new Error(payload?.error?.message || "Unable to create safe rewrite.")
      }

      setSafeResponse(payload.data)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to rewrite.")
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-8">
        <Link href="/voice" className="text-sm text-white/80 underline">
          ← Record a new voice note
        </Link>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Voice-to-Calm session</h1>
          <p className="text-sm text-white/70">
            Review the transcription, emotion analysis, and generate a safe rewrite.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">Loading…</div>
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
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Status</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    session.status === "processing"
                      ? "bg-yellow-500/20 text-yellow-200"
                      : session.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-200"
                  }`}
                >
                  {session.status}
                </span>
              </div>
              {session.transcribedText && (
                <p className="text-sm text-white/80 whitespace-pre-wrap">{session.transcribedText}</p>
              )}
              {session.failureReason && (
                <p className="text-xs text-rose-200">Issue: {session.failureReason}</p>
              )}
            </div>

            {session.emotionAnalysis && (
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { label: "Frustration", value: session.emotionAnalysis.frustrationScore },
                  { label: "Urgency", value: session.emotionAnalysis.urgencyScore },
                  { label: "Defensiveness", value: session.emotionAnalysis.defensivenessScore },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">{item.label}</p>
                    <p className="text-2xl font-semibold text-white">
                      {typeof item.value === "number" ? item.value.toFixed(0) : "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Rewrite options</p>
              <div className="space-y-2 text-sm text-white/80">
                <label className="flex flex-col gap-1">
                  Target tone
                  <select
                    className="rounded-xl bg-black/40 px-4 py-2 text-white focus:outline-none"
                    value={targetTone}
                    onChange={(event) => setTargetTone(event.target.value)}
                  >
                    <option value="empathetic">Empathetic</option>
                    <option value="professional">Professional</option>
                    <option value="calm">Calm</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={preserveIntent}
                    onChange={(event) => setPreserveIntent(event.target.checked)}
                  />
                  Preserve original intent
                </label>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={session.status !== "completed" || isGenerating}
                className="w-full bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white"
              >
                {isGenerating ? "Generating..." : "Generate safe rewrite"}
              </Button>
            </div>

            {safeResponse && (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Safe rewrite</p>
                <div className="rounded-xl bg-white/10 p-4 text-sm text-white/80">
                  {safeResponse.safeVersion}
                </div>
                <div className="space-y-1 text-xs text-white/60">
                  <p>Key changes:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {safeResponse.keyChanges.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleUseVersion} className="w-full border border-white/20">
                    Use this version
                  </Button>
                  <p className="text-xs text-white/50">
                    This will load the rewrite in the main editor for editing or sending.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
