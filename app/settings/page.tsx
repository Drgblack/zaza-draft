"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
}

export default function SettingsPage() {
  const { prefs } = useTeacherPrefs()
  const signatureLines = [prefs.signatureLine1, prefs.signatureLine2, prefs.signatureLine3].filter(
    Boolean,
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 opacity-80" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.4em] text-white/70">Personalized control</p>
          <h1 className="text-4xl font-semibold">Preferences</h1>
          <p className="max-w-3xl text-sm text-white/70">
            Keep your most important defaults in one place. We lock the heavy lifting until the next
            release, but you can always head back to the draft to keep writing.
          </p>
        </div>

        <Link href="/">
          <Button className="w-fit rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-2 text-white shadow-lg shadow-purple-500/40">
            Back to Draft
          </Button>
        </Link>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/85 text-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Tone defaults</p>
                <p className="text-2xl font-semibold text-gray-900">{prefs.preferredTone}</p>
              </div>
              <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                Locked
              </Badge>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Tone controls will unlock when we connect to your tone history. Until then, we honor
              the tone you have selected in the editor.
            </p>
          </Card>

          <Card className="bg-white/85 text-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Language</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {LANGUAGE_LABELS[prefs.preferredLanguage] ?? prefs.preferredLanguage}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Language defaults mirror your last document and automatically roll into new drafts
              without manual adjustments.
            </p>
          </Card>

          <Card className="bg-white/85 text-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Signature</p>
                <p className="text-sm text-gray-600">Preview</p>
              </div>
              <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                Locked
              </Badge>
            </div>
            <div className="mt-3 h-32 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4 text-sm text-gray-800 shadow-inner">
              {signatureLines.length ? (
                <div className="space-y-1">
                  {signatureLines.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No signature set yet.</p>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Signature editing arrives with the next phase of export workflows. Until then we keep
              the preview read-only.
            </p>
          </Card>

          <Card className="bg-white/90 text-gray-900">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Safeguarding defaults</p>
              <p className="text-xl font-semibold text-gray-900">What we protect</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>• We never store full student names or identifiers without explicit permission.</li>
              <li>• Sensitive attachments, private addresses, and contact information remain off-limits.</li>
              <li>• You can toggle anonymized data sharing from within the insights panel.</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              These defaults are enforced automatically. If you need a tighter guardrail, reach out
              through the support menu in the editor.
            </p>
          </Card>
        </div>

        <div className="mt-4 flex justify-end">
          <Link href="/">
            <Button className="w-fit rounded-full bg-white px-6 py-2 text-gray-900 shadow-lg shadow-white/20">
              Back to Draft
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
