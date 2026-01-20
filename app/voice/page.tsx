"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"

const SUPPORTED_FORMATS = ["WAV", "MP3", "M4A"]
const LANGUAGE_OPTIONS = [
  { label: "English (UK)", value: "en-GB" },
  { label: "English (US)", value: "en-US" },
  { label: "Deutsch", value: "de-DE" },
]

export default function VoiceCapturePage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const { t } = useLocale()
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("en-GB")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const voiceConfigMissing =
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const configError = voiceConfigMissing ? t("voice.error.configMissing") : null
  const primaryButtonClass =
    "w-full rounded-xl bg-indigo-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-black/40 transition duration-200 hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-slate-900 disabled:bg-indigo-600 disabled:text-white/70 disabled:cursor-not-allowed"
  const selectedFileInfo = file
    ? `${t("voiceSelected")}: ${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
    : null

  const handleSubmit = async () => {
    if (voiceConfigMissing) {
      setError(t("voice.error.configMissing"))
      return
    }

    if (!file) {
      setError(t("voice.error.chooseFile"))
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
      setError(recordError instanceof Error ? recordError.message : t("voice.error.uploadFailed"))
    } finally {
      setIsUploading(false)
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white">
      <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-4xl flex-col space-y-8 px-4 py-12">
        <Link href="/" className="text-sm text-white/80 underline">
          {t("voiceBackLink")}
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{t("voiceTitle")}</h1>
          <p className="text-sm text-white/70">{t("voiceDescription")}</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 space-y-3 text-sm text-white/70">
          <p className="uppercase tracking-[0.3em] text-xs text-white/60">{t("voiceSupportedLabel")}</p>
          <p>{SUPPORTED_FORMATS.join(" · ")}</p>
          <p>{t("voiceMaxDurationNote")}</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/40 p-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">{t("voiceLanguageLabel")}</label>
            <select
              className="mt-1 w-full rounded-xl bg-white/80 px-4 py-3 text-gray-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div>
            <label className="block text-sm font-semibold text-white">{t("voiceUploadLabel")}</label>
            <input
              type="file"
              accept="audio/*"
              capture="environment"
              className="text-xs text-white"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          {selectedFileInfo && (
            <p className="text-xs text-white/70">{selectedFileInfo}</p>
          )}
          {voiceConfigMissing && (
            <div
              className="rounded-2xl border border-amber-300/80 bg-amber-200/10 p-3 text-xs text-amber-200"
              role="alert"
            >
              {configError}
            </div>
          )}
          {error && (
            <div
              className="rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 text-xs text-rose-100"
              role="alert"
            >
              {error}
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading || voiceConfigMissing}
            className={primaryButtonClass}
          >
            {isUploading ? t("voiceProcessing") : t("voiceButton")}
          </Button>
        </div>

        <div className="space-y-1 text-sm text-white/70">
          <p>{t("voiceFooterTip")}</p>
          <p>
            {t("panicScanDocsLink")}{" "}
            <Link href="/docs#voice-to-calm" className="underline">
              {t("docsLinkLabel")}
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

