"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { isDebugEnabled } from "@/lib/debug"

const SUPPORTED_FORMATS = ["WAV", "MP3", "M4A"]
const LANGUAGE_OPTIONS = [
  { label: "English (UK)", value: "en-GB" },
  { label: "English (US)", value: "en-US" },
  { label: "Deutsch", value: "de-DE" },
]
const MAX_RECORDING_SECONDS = 90

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("webm")) {
    return "webm"
  }
  if (mimeType.includes("ogg")) {
    return "ogg"
  }
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3"
  }
  return "webm"
}

export default function VoiceCapturePage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const { t } = useLocale()
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("en-GB")
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [missingAiEnv, setMissingAiEnv] = useState<string[] | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [maxRecordingReached, setMaxRecordingReached] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"record" | "upload">("record")
  const [aiConfigured, setAiConfigured] = useState(true)
  const [lastErrorMeta, setLastErrorMeta] = useState<{ stage?: string; code?: string } | null>(null)
  const recordingIntervalRef = useRef<number | null>(null)
  const recordingTimeoutRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const voiceConfigMissing =
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const configError = voiceConfigMissing ? t("voice.error.configMissing") : null
  const disableHint =
    mode === "record" ? t("voice.recordNowHint") : t("voice.error.chooseFile")
  const disableReason = !aiConfigured
    ? t("config.aiMissingReason")
    : voiceConfigMissing
    ? t("voice.error.configMissing")
    : !recordingFile && !file
    ? disableHint
    : isUploading
    ? t("voiceProcessing")
    : null
  const buttonDisabled = Boolean(disableReason)
  const debugHint =
    isDebugEnabled() && disableReason ? `${t("debug.disableHintPrefix")} ${disableReason}` : null

  const selectedFileInfo = useMemo(() => {
    if (recordingFile) {
      return `${t("voice.recordedLabel")}: ${formatDuration(recordingTime)}`
    }
    if (file) {
      return `${t("voiceSelected")}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`
    }
    return null
  }, [file, recordingFile, recordingTime, t])

  const resetRecording = useCallback(() => {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
    }
    setRecordingUrl(null)
    setRecordingFile(null)
    setRecordingError(null)
    setMaxRecordingReached(false)
    setRecordingTime(0)
    recordedChunksRef.current = []
  }, [recordingUrl])

  const cleanupRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    recorderRef.current = null
  }

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    }
    cleanupRecording()
    setIsRecording(false)
  }, [])

  const startRecording = async () => {
    if (isRecording) {
      return
    }
    resetRecording()
    setRecordingError(null)
    setMaxRecordingReached(false)

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError(t("voice.error.recordingUnsupported"))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      recordedChunksRef.current = []
      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime })
      recorderRef.current = recorder

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener("stop", () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        const extension = getFileExtension(blob.type || "audio/webm")
        const recorded = new File([blob], `voice.${extension}`, {
          type: blob.type || "audio/webm",
        })
        setRecordingFile(recorded)
        setRecordingUrl(URL.createObjectURL(blob))
        setFile(null)
      })

      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_SECONDS) {
            return prev
          }
          return prev + 1
        })
      }, 1000)
      recordingTimeoutRef.current = window.setTimeout(() => {
        setMaxRecordingReached(true)
        stopRecording()
      }, MAX_RECORDING_SECONDS * 1000)
    } catch (recordError) {
      console.error("[voice] recording failed", recordError)
      setRecordingError(t("voice.error.recordingUnsupported"))
    }
  }

  const handleRecordingAgain = () => {
    stopRecording()
    resetRecording()
    setMode("record")
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    if (nextFile) {
      setRecordingFile(null)
      setRecordingUrl(null)
      setRecordingTime(0)
      setRecordingError(null)
    }
  }

  useEffect(() => {
    return () => {
      cleanupRecording()
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl)
      }
    }
  }, [recordingUrl])

  useEffect(() => {
    let isMounted = true
    const loadDiagnostics = async () => {
      try {
        const token = await getIdToken()
        if (!token) {
          return
        }
        const response = await fetch("/api/diagnostics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
        const payload = await response.json().catch(() => null)
        if (!isMounted) {
          return
        }
        if (response.ok && payload?.success) {
          setAiConfigured(Boolean(payload.data?.aiConfigured))
        }
      } catch (diagError) {
        console.error("[voice] diagnostics failed", diagError)
      }
    }

    if (status === "authenticated") {
      loadDiagnostics()
    }

    return () => {
      isMounted = false
    }
  }, [status, getIdToken])

  const handleSubmit = async () => {
    if (!aiConfigured) {
      setError(t("config.aiMissingReason"))
      return
    }
    if (voiceConfigMissing) {
      setError(t("voice.error.configMissing"))
      return
    }
    const payloadFile = recordingFile ?? file
    if (!payloadFile) {
      setError(disableHint)
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
      form.append("file", payloadFile)
      form.append("language", language)
      form.append("sessionId", crypto.randomUUID())

      const response = await fetch("/api/voice/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      const payload = await response.json().catch(() => null)
      if (payload?.diagnostics) {
        setAiConfigured(Boolean(payload.diagnostics.aiConfigured))
      }
      if (!response.ok || !payload?.success) {
        setLastErrorMeta({
          stage: payload?.error?.stage,
          code: payload?.error?.code,
        })
        const missingEnv =
          payload?.error?.details && Array.isArray(payload.error.details["missingEnv"])
            ? payload.error.details["missingEnv"]
            : null
        if (missingEnv) {
          setMissingAiEnv(missingEnv)
        }
        const message =
          payload?.error?.message ??
          payload?.message ??
          `Upload failed (HTTP ${response.status})`
        setError(message)
        return
      }

      setMissingAiEnv(null)
      setLastErrorMeta(null)
      router.push(`/voice/${payload.data.voiceSessionId}`)
    } catch (recordError) {
      setError(
        recordError instanceof Error ? recordError.message : t("voice.error.uploadFailed"),
      )
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

  const primaryButtonLabel = recordingFile ? t("voice.useRecording") : t("voiceButton")

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
        {!aiConfigured && (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-200/10 p-3 text-xs text-amber-200">
            {t("config.aiMissingBanner")}
            {missingAiEnv && missingAiEnv.length > 0 && (
              <p className="mt-1 text-[11px] text-amber-100">
                {t("voice.aiMissingEnvList", { envs: missingAiEnv.join(", ") })}
              </p>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 space-y-3 text-sm text-white/70">
          <p className="uppercase tracking-[0.3em] text-xs text-white/60">{t("voiceSupportedLabel")}</p>
          <p>{SUPPORTED_FORMATS.join(" / ")}</p>
          <p>{t("voiceMaxDurationNote")}</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/40 p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("record")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "record"
                  ? "bg-indigo-900/80 text-white shadow-lg shadow-indigo-900/60"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {t("voice.tab.recordNow")}
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "upload"
                  ? "bg-indigo-900/80 text-white shadow-lg shadow-indigo-900/60"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {t("voice.tab.uploadFile")}
            </button>
          </div>
          {mode === "record" ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <p>{t("voice.recordNowHint")}</p>
              {recordingError && (
                <p className="text-xs text-rose-200">{recordingError}</p>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {isRecording
                      ? t("voice.recordingTimer", { duration: formatDuration(recordingTime) })
                      : recordingFile
                      ? `${t("voice.recordedLabel")}: ${formatDuration(recordingTime)}`
                      : t("voice.recordNowHint")}
                  </span>
                  {maxRecordingReached && (
                    <span className="text-xs text-amber-200">{t("voice.maxRecordingReached")}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isUploading}
                  >
                    {isRecording ? t("voice.stopRecording") : t("voice.startRecording")}
                  </Button>
                  {recordingFile && (
                    <Button
                      variant="ghost"
                      className="flex-1 border border-white/20 text-white"
                      onClick={handleRecordingAgain}
                      disabled={isRecording || isUploading}
                    >
                      {t("voice.recordAgain")}
                    </Button>
                  )}
                </div>
                {recordingUrl && (
                  <audio
                    className="w-full rounded-xl bg-white/10 p-1"
                    controls
                    src={recordingUrl}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-white/60">
                {t("voiceUploadLabel")}
              </label>
              <input
                id="voice-file"
                type="file"
                accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/m4a"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  handleFileChange(event)
                }}
              />
              <label
                htmlFor="voice-file"
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                {t("voiceUploadLabel")}
              </label>
            </div>
          )}
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
          <div className="space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={buttonDisabled}
              type="button"
              loading={isUploading}
              className="w-full rounded-xl bg-indigo-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-black/40 transition duration-200 hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-slate-900 disabled:bg-indigo-600 disabled:text-white/70 disabled:cursor-not-allowed"
              aria-label={disableReason ?? primaryButtonLabel}
            >
              {isUploading ? t("voiceProcessing") : primaryButtonLabel}
            </Button>
            {isUploading && (
              <p className="text-center text-xs text-white/70" role="status">
                {t("voiceProcessing")}
              </p>
            )}
            {disableReason && (
              <p className="text-center text-xs text-white/60">{disableReason}</p>
            )}
            {!!debugHint && (
              <p className="text-center text-[11px] text-white/40 tracking-wide">{debugHint}</p>
            )}
            {isDebugEnabled() && lastErrorMeta && (
              <p className="text-center text-[11px] text-white/50 tracking-wide">
                Stage: {lastErrorMeta.stage ?? "unknown"} · Code: {lastErrorMeta.code ?? "unknown"}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm text-white/70">
          <p>{t("voiceFooterTip")}</p>
          <p>
            {t("panicScanDocsLink")}{" "}
            <Link href="/docs/voice-to-calm" className="underline">
              {t("docsLinkLabel")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
