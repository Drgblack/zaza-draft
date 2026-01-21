"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { isDebugEnabled } from "@/lib/debug"

const SUPPORTED_FORMATS = ["JPG", "PNG", "HEIC"]

export default function PanicScanPage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const { t } = useLocale()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [platform, setPlatform] = useState<"web" | "mobile_ios" | "mobile_android">("web")
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
    ],
    [t],
  )
  const selectedFileInfo = file
    ? `${t("panicScanSelected")}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`
    : null

  const disableReason = panicConfigMissing
    ? t("panicScan.error.configMissing")
    : !file
    ? t("panicScan.error.chooseFile")
    : isUploading
    ? t("panicScanUploading")
    : null
  const buttonDisabled = Boolean(disableReason)
  const debugHint =
    isDebugEnabled() && disableReason ? `${t("debug.disableHintPrefix")} ${disableReason}` : null

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    if (nextFile) {
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (panicConfigMissing) {
      setError(t("panicScan.error.configMissing"))
      return
    }

    if (!file) {
      setError(t("panicScan.error.chooseFile"))
      return
    }

    setError(null)
    setIsUploading(true)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Sign in again to continue.")
      }

      const form = new FormData()
      form.append("file", file)
      form.append("platform", platform)
      form.append("sessionId", crypto.randomUUID())

      const response = await fetch("/api/panic-scan/upload", {
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

      router.push(`/panic-scan/${payload.data.scanId}`)
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : t("panicScan.error.uploadFailed"),
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
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="text-xs text-white"
            onChange={handleFileChange}
          />
          {selectedFileInfo && (
            <p className="mt-2 text-xs text-white/70">{selectedFileInfo}</p>
          )}
          {panicConfigMissing && (
            <div
              className="mt-2 rounded-2xl border border-amber-300/80 bg-amber-200/10 p-3 text-xs text-amber-200"
              role="alert"
            >
              {configError}
            </div>
          )}
          {error && (
            <div
              className="mt-2 rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 text-xs text-rose-100"
              role="alert"
            >
              {error}
            </div>
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
            {!file && (
              <p className="text-center text-xs text-white/60">
                {t("panicScan.helper.selectFile")}
              </p>
            )}
            {!!debugHint && (
              <p className="text-center text-[11px] text-white/40 tracking-wide">{debugHint}</p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm text-white/70">
          <p>{t("panicScanExpiryNote")}</p>
          <p>
            {t("panicScanDocsLink")}{" "}
            <Link href="/docs#panic-scan" className="underline">
              {t("docsLinkLabel")}
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

