"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"

const SUPPORTED_FORMATS = ["WAV", "MP3", "M4A"]
const LANGUAGE_OPTIONS = [
  { label: "English (UK)", value: "en-GB" },
  { label: "English (US)", value: "en-US" },
  { label: "Deutsch", value: "de-DE" },
]

export default function VoiceCapturePage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("en-GB")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file) {
      setError("Choose an audio file to record.")
      return
    }

    setIsUploading(true)
    setError(null)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Sign in again to continue.")
      }

      const form = new FormData()
      form.append("file", file)
      form.append("language", language)
      form.append("sessionId", crypto.randomUUID())

      const response = await fetch("/api/voice/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || "Upload failed.")
      }

      router.push(`/voice/${payload.data.voiceSessionId}`)
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Upload failed.")
    } finally {
      setIsUploading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/" className="text-sm text-white/80 underline">
          ← Back to Draft editor
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Voice-to-Calm</h1>
          <p className="text-sm text-white/70">
            Speak when emotions run high and let Zaza Draft listen, summarize, analyze tone, and draft a calm rewrite.
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 space-y-4">
          <div className="space-y-1 text-sm text-white/80">
            <p>Supported audio: {SUPPORTED_FORMATS.join(" • ")}</p>
            <p>Maximum duration: 90 seconds. Default language: English (UK).</p>
            <p>No audio is kept longer than one hour.</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Language</label>
            <select
              className="mt-1 w-full rounded-xl bg-white/80 px-4 py-3 text-gray-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/40 p-6 space-y-4">
          <label className="block text-sm font-semibold text-white">Upload recording</label>
          <input
            type="file"
            accept="audio/*"
            capture="environment"
            className="text-xs text-white"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file && (
            <p className="text-xs text-white/70">
              Selected: {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="w-full bg-gradient-to-br from-[#fbbf24] via-[#f97316] to-[#ef4444] text-white"
          >
            {isUploading ? "Uploading..." : "Transcribe & analyze"}
          </Button>
        </div>

        <div className="text-sm text-white/70">
          Not ready to upload? Record voice notes on your phone and send to yourself via Airdrop/Share, then upload the WAV/MP3 file here.
        </div>
      </div>
    </div>
  )
}
