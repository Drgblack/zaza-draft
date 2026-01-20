"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth/auth-screen"
import { useAuth } from "@/hooks/use-auth"

const SUPPORTED_FORMATS = ["JPG", "PNG", "HEIC"]

export default function PanicScanPage() {
  const router = useRouter()
  const { status, getIdToken } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [platform, setPlatform] = useState<"web" | "mobile_ios" | "mobile_android">("web")

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
      "Upload a screenshot or camera photo of the original message (nurture the context without typing).",
      "We automatically OCR, classify tone/risk, and propose a calm reply.",
      "No media is stored long-term: screenshots expire after 24 hours.",
    ],
    [],
  )

  const handleSubmit = async () => {
    if (!file) {
      setError("Choose an image to scan.")
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
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
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
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-950 to-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 space-y-8">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-white/80 underline">
            ← Back to Draft editor
          </Link>
          <h1 className="text-3xl font-semibold">Panic Scan</h1>
          <p className="text-sm text-white/70">
            Upload a screenshot or photo of the stressful message and let Zaza Draft explain it, assess risk,
            and prepare a calm reply path.
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Supported Input Types</p>
            <ul className="grid gap-2 text-sm text-white/80 md:grid-cols-3">
              {SUPPORTED_FORMATS.map((format) => (
                <li key={format} className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-center">
                  {format}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            {instructions.map((item) => (
              <p key={item} className="text-sm text-white/70">
                • {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-purple-900/60">
          <label className="block text-sm font-semibold text-white mb-2">Upload screenshot/photo</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="text-xs text-white"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file && (
            <p className="mt-2 text-xs text-white/70">
              Selected: {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
          {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
          <div className="mt-4">
            <Button
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className="w-full bg-gradient-to-br from-[#f06292] via-[#ec4899] to-[#c026d3] text-white"
            >
              {isUploading ? "Uploading..." : "Analyze screenshot"}
            </Button>
          </div>
        </div>
        <div className="text-sm text-white/70">
          <p>Images expire after 24 hours. We never keep copies beyond that window.</p>
          <p className="mt-2">
            Need more detail? <Link href="/docs" className="underline">See the documentation</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
