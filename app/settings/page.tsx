"use client"

import { useState } from "react"
import { ArrowLeft, ChevronRight, Info, LockKeyhole, PenTool, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
}

const TOP_BUTTON_CLASSES =
  "flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"

const LOCKED_CARD =
  "relative min-h-[320px] rounded-2xl border-2 border-gray-200 bg-white/95 p-8 text-gray-900 shadow-xl shadow-purple-900/30 opacity-95 cursor-not-allowed transition-all duration-300 backdrop-blur-sm"

const INTERACTIVE_CARD =
  "group relative min-h-[320px] rounded-2xl border-2 border-gray-200 bg-white/95 p-8 text-gray-900 shadow-xl shadow-purple-900/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 backdrop-blur-sm"

const SAFEGUARD_CARD =
  "min-h-[320px] rounded-2xl border-2 border-gray-200 bg-gray-50/90 p-8 text-gray-900 shadow-xl shadow-purple-900/30"

export default function SettingsPage() {
  const { prefs } = useTeacherPrefs()
  const router = useRouter()
  const signatureLines = [prefs.signatureLine1, prefs.signatureLine2, prefs.signatureLine3].filter(
    Boolean,
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleReturn = () => {
    if (isSaving) return
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      router.push("/")
    }, 400)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 opacity-80 pointer-events-none" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-20 pb-32 md:px-6 lg:px-8 md:pt-24">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.4em] text-purple-300">Personalized control</p>
          <h1 className="text-5xl font-semibold leading-tight">Preferences</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">
            Keep your most important defaults in one place. We lock the heavy lifting until the next
            release, but you can always head back to the draft to keep writing.
          </p>
        </div>

        <div className="flex justify-start">
          <Button onClick={handleReturn} className={TOP_BUTTON_CLASSES} disabled={isSaving}>
            <ArrowLeft className="h-4 w-4" />
            {isSaving ? "Saving…" : "Back to Draft"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className={LOCKED_CARD}>
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-2 rounded-full border border-purple-300 bg-purple-100/90 px-3 py-1.5 text-xs font-semibold text-purple-700">
                <LockKeyhole className="h-3 w-3" />
                Locked
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-gray-700">Tone defaults</p>
              <p className="mb-4 text-3xl font-bold text-gray-900">{prefs.preferredTone}</p>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              Tone controls will unlock when we connect to your tone history. Until then, we honor the
              tone you have selected in the editor.
            </p>
          </Card>

          <Card
            className={`${INTERACTIVE_CARD} focus-visible:ring-offset-2`}
            tabIndex={0}
            role="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-700">Language</p>
                <p className="mb-2 text-3xl font-bold text-gray-900">
                  {LANGUAGE_LABELS[prefs.preferredLanguage] ?? prefs.preferredLanguage}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-700 transition-colors duration-300 group-hover:text-gray-900" aria-hidden />
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              Language defaults mirror your last document and automatically roll into new drafts without
              manual adjustments.
            </p>
          </Card>

          <Card className={LOCKED_CARD}>
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-2 rounded-full border border-purple-300 bg-purple-100/90 px-3 py-1.5 text-xs font-semibold text-purple-700">
                <LockKeyhole className="h-3 w-3" />
                Locked
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-700">Signature</p>
                <p className="mb-4 text-3xl font-bold text-gray-900">Preview</p>
              </div>
              <PenTool className="h-5 w-5 text-gray-700" aria-hidden />
            </div>
            <div className="border-2 border-gray-300 bg-white p-6 shadow-inner">
              {signatureLines.length ? (
                <div className="space-y-1 font-[cursive] text-lg font-semibold leading-relaxed text-purple-700">
                  {signatureLines.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-purple-600">No signature set yet.</p>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Signature editing arrives with the next phase of export workflows. Until then we keep the
              preview read-only.
            </p>
          </Card>

          <Card className={SAFEGUARD_CARD}>
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="h-5 w-5 text-blue-500" />
              <p className="text-xs font-semibold tracking-wider text-gray-700">
                Safeguarding defaults
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-3xl font-bold text-gray-900">What we protect</p>
              <Info className="h-5 w-5 text-gray-700" />
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
              <li>• We never store full student names or identifiers without explicit permission.</li>
              <li>• Sensitive attachments, private addresses, and contact information remain off-limits.</li>
              <li>• You can toggle anonymized data sharing from within the insights panel.</li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              These defaults are enforced automatically. If you need a tighter guardrail, reach out
              through the support menu in the editor.
            </p>
          </Card>
        </div>

      </div>
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          onClick={handleReturn}
          className={`${TOP_BUTTON_CLASSES} shadow-xl`}
          disabled={isSaving}
        >
          <ArrowLeft className="h-4 w-4" />
          {isSaving ? "Saving…" : "Back to Draft"}
        </Button>
      </div>
    </div>
  )
}
