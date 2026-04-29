"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { isDebugEnabled } from "@/lib/debug"

const SUPPORTED_FORMATS = ["JPG", "PNG", "HEIC"]

export default function PanicScanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, getIdToken } = useAuth()
  const { t, locale } = useLocale()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [platform, setPlatform] = useState<"web" | "mobile_ios" | "mobile_android">("web")
  const [aiConfigured, setAiConfigured] = useState(true)
  const [lastDiagnostics, setLastDiagnostics] = useState<Record<string, any> | null>(null)
  const [lastErrorMeta, setLastErrorMeta] = useState<{ stage?: string; code?: string } | null>(null)
  const uploadInFlightRef = useRef(false)
  const [pageSessionId] = useState(
    () => globalThis.crypto?.randomUUID?.() ?? `panic-session-${Date.now()}`,
  )
  const [errorDetails, setErrorDetails] = useState<
    | {
        code?: string
        stage?: string
        details?: string
        requestId?: string
      }
    | null
  >(null)
  const [detailsVisible, setDetailsVisible] = useState(false)
  const panicConfigMissing =
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const configError = panicConfigMissing ? t("panicScan.error.configMissing") : null
  const primaryButtonClass =
    "w-full rounded-xl bg-indigo-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-black/40 transition duration-200 hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-slate-900 disabled:bg-indigo-600 disabled:text-white/70 disabled:cursor-not-allowed"

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return
    }
    const ua = navigator.userAgent
    if (/android/i.test(ua)) {
      setPlatform("mobile_android")
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      setPlatform("mobile_ios")
    } else {
      setPlatform("web")
    }
  }, [])

  const instructions = useMemo(
    () => [
      t("panicScanInstructionUpload"),
      t("panicScanInstructionAuto"),
      t("panicScanInstructionTTL"),
      t("panicScanDeleteNote"),
    ],
    [t],
  )
  const selectedFileInfo = file
    ? `${t("panicScanSelected")}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`
    : null

  const disableReason = !aiConfigured
    ? t("config.aiMissingReason")
    : panicConfigMissing
    ? t("panicScan.error.configMissing")
    : !file
    ? t("panicScan.error.chooseFile")
    : isUploading
    ? t("panicScanUploading")
    : null
  const buttonDisabled = Boolean(disableReason)
  const debugHint =
    isDebugEnabled() && disableReason ? `${t("debug.disableHintPrefix")} ${disableReason}` : null
  const deletedNoticeVisible = searchParams.get("deleted") === "1"

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    if (nextFile) {
      setError(null)
    }
  }

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
        console.error("[panic-scan] diagnostics failed", diagError)
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
    if (uploadInFlightRef.current || isUploading) {
      return
    }

    if (!aiConfigured) {
      setError(t("config.aiMissingReason"))
      return
    }

    if (panicConfigMissing) {
      setError(t("panicScan.error.configMissing"))
      return
    }

    if (!file) {
      setError(t("panicScan.error.chooseFile"))
      return
    }

    uploadInFlightRef.current = true
    setError(null)
    setIsUploading(true)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Sign in again to continue.")
      }

      const form = new FormData()
      const uploadAttemptId =
        globalThis.crypto?.randomUUID?.() ?? `${pageSessionId}-${Date.now()}`
      form.append("file", file)
      form.append("platform", platform)
      form.append("sessionId", pageSessionId)
      form.append("uploadAttemptId", uploadAttemptId)
      form.append("uiLocale", locale)

      const response = await fetch("/api/panic-scan/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      const contentType = response.headers.get("content-type") ?? ""
      const isJson = contentType.includes("application/json")
      const requestId =
        response.headers.get("x-request-id") ?? response.headers.get("x-zaza-request-id") ?? null

      let payload: Record<string, unknown> | null = null
      let fallbackText: string | null = null

      if (isJson) {
        payload = await response.json().catch((parseError) => {
          console.error("[panic-scan] failed to parse JSON response", parseError)
          return null
        })
      } else {
        fallbackText = await response.text().catch(() => null)
      }

      if (payload?.diagnostics) {
        const diagnostics = payload.diagnostics as Record<string, any>
        setLastDiagnostics(diagnostics)
        if (typeof diagnostics.aiConfigured === "boolean") {
          setAiConfigured(Boolean(diagnostics.aiConfigured))
        }
      }

      const successFlag =
        Boolean(payload) && ((payload as any).ok === true || (payload as any).success === true)
      const scanId = (payload as any)?.data?.scanId ?? (payload as any)?.scanId

      if (response.ok && successFlag && scanId) {
        setLastErrorMeta(null)
        setErrorDetails(null)
        setDetailsVisible(false)
        router.push(`/panic-scan/${scanId}`)
        return
      }

      const stage = (payload as any)?.stage ?? (payload as any)?.error?.stage ?? "unknown"
      const code = (payload as any)?.error?.code
      setLastErrorMeta({ stage, code })

      const formattedRequestId = requestId ? ` (Request ID: ${requestId})` : ""

      if (response.ok) {
        const violationMessage = `We received an unexpected response from the server${formattedRequestId}. Please try again.`
        setDetailsVisible(false)
        setErrorDetails({
          code,
          stage,
          details: fallbackText ?? (payload ? JSON.stringify(payload, null, 2) : undefined),
          requestId: requestId ?? undefined,
        })
        setError(violationMessage)
        return
      }

      const payloadErrorMessage =
        (payload as any)?.error?.message ?? (payload as any)?.message
      const detailsPayload = (payload as any)?.error?.details

      const diagnosticMessage =
        payloadErrorMessage ??
        (fallbackText
          ? `${fallbackText.slice(0, 250)}${fallbackText.length > 250 ? "." : ""}`
          : "Unexpected server response. Please try again or contact support.")
      const messageWithRequestId = `${diagnosticMessage}${formattedRequestId}`

      const detailsText =
        detailsPayload != null
          ? typeof detailsPayload === "string"
            ? detailsPayload
            : JSON.stringify(detailsPayload, null, 2)
          : fallbackText

      setDetailsVisible(false)
      setErrorDetails({
        code,
        stage,
        details: detailsText ? detailsText.slice(0, 1000) : undefined,
        requestId: requestId ?? undefined,
      })
      setError(t("panicScan.error.analysisFailed", { message: messageWithRequestId }))
      return
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : t("panicScan.error.uploadFailed"),
      )
    } finally {
      uploadInFlightRef.current = false
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
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-950 to-black text-white">
      <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-4xl flex-col space-y-8 px-4 py-16">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-white/80 underline">
            {t("panicScanBackLink")}
          </Link>
          <h1 className="text-3xl font-semibold">{t("panicScanTitle")}</h1>
          <p className="text-sm text-white/70">{t("panicScanDescription")}</p>
        </div>
        {deletedNoticeVisible && (
          <div
            className="rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-4 text-sm text-emerald-100"
            role="alert"
          >
            {t("panicScanDeleteSuccess")}
          </div>
        )}
        {!aiConfigured && (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-200/10 p-3 text-xs text-amber-200">
            {t("config.aiMissingBanner")}
          </div>
        )}
        {lastDiagnostics?.storageConfigured === false && (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-200/10 p-3 text-xs text-amber-200">
            <p>{t("panicScan.storageBanner")}</p>
            {lastDiagnostics?.storageError && (
              <p className="mt-1 text-[11px] text-amber-100">
                {t("panicScan.storageBannerDetail", {
                  detail: lastDiagnostics.storageError,
                })}
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">
              {t("panicScanSupportedLabel")}
            </p>
            <ul className="grid gap-2 text-sm text-white/80 md:grid-cols-3">
              {SUPPORTED_FORMATS.map((format) => (
                <li key={format} className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-center">
                  {format}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 text-sm text-white/70">
            {instructions.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-purple-900/60">
          <label className="block text-sm font-semibold text-white mb-2">
            {t("panicScanUploadLabel")}
          </label>
          {panicConfigMissing && (
            <div
              className="mb-4 rounded-2xl border border-amber-300/80 bg-amber-200/10 p-3 text-xs text-amber-200"
              role="alert"
            >
              {configError}
            </div>
          )}
          <input
            id="panic-file"
            type="file"
            accept="image/jpeg,image/png,image/heic"
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
          />
          <label
            htmlFor="panic-file"
            className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            {t("panicScanUploadLabel")}
          </label>
          {selectedFileInfo && (
            <p className="mt-2 text-xs text-white/70">{selectedFileInfo}</p>
          )}
          {error && (
            <div
              className="mt-2 rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 text-xs text-rose-100"
              role="alert"
            >
              {error}
            </div>
          )}
          {lastErrorMeta?.stage === "ocr" && (
            <p className="mt-2 text-xs text-white/60">{t("panicScan.ocrTip")}</p>
          )}
          <div className="mt-4 space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={buttonDisabled}
              type="button"
              loading={isUploading}
              className={primaryButtonClass}
              aria-label={disableReason ?? t("panicScanButton")}
            >
              {isUploading ? t("panicScanUploading") : t("panicScanButton")}
            </Button>
            {isUploading && (
              <p className="text-center text-xs text-white/70" role="status">
                {t("panicScanUploading")}
              </p>
            )}
            {disableReason && (
              <p className="text-center text-xs text-white/60">{disableReason}</p>
            )}
            {!!debugHint && (
              <p className="text-center text-[11px] text-white/40 tracking-wide">{debugHint}</p>
            )}
            {isDebugEnabled() && lastErrorMeta && (
              <p className="text-center text-[11px] text-white/50">
                Stage: {lastErrorMeta.stage ?? "unknown"} · Code: {lastErrorMeta.code ?? "unknown"}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm text-white/70">
          <p>{t("panicScanExpiryNote")}</p>
          <p>{t("panicScanDeleteNote")}</p>
        </div>

      </div>
    </div>
  )
}

