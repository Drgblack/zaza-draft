"use client"

import { useState } from "react"
import { ArrowLeft, ChevronRight, Info, LockKeyhole, PenTool, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import FooterSlim from "@/components/FooterSlim"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useLocale } from "@/hooks/use-locale"
import type { Locale } from "@/hooks/use-locale"
import { backToDraftButtonClasses } from "@/lib/ui/back-to-draft"

const LANGUAGE_DISPLAY_NAMES: Record<Locale, Record<string, string>> = {
  "en-GB": { en: "English", de: "Deutsch" },
  "en-US": { en: "English", de: "Deutsch" },
  "de-DE": { en: "Englisch", de: "Deutsch" },
}
const FALLBACK_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "Deutsch",
}

const getLanguageLabel = (locale: Locale, code: string) =>
  LANGUAGE_DISPLAY_NAMES[locale]?.[code] ?? FALLBACK_LANGUAGE_NAMES[code] ?? code

const CARD_BASE =
  "relative min-h-[320px] rounded-2xl border border-gray-200 bg-white/95 p-8 text-gray-900 shadow-2xl shadow-purple-900/40 transition-all duration-300 backdrop-blur-sm"
const LOCKED_CARD = `${CARD_BASE} opacity-90 cursor-not-allowed`
const INTERACTIVE_CARD =
  `${CARD_BASE} cursor-pointer hover:shadow-[0_25px_45px_rgba(99,102,241,0.35)] hover:scale-[1.01] hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-400`
const SAFEGUARD_CARD =
  "min-h-[320px] rounded-2xl border border-gray-200 bg-blue-50/70 p-8 text-gray-900 shadow-2xl shadow-purple-900/20"
const LOCKED_BADGE =
  "flex items-center gap-2 rounded-full border border-purple-300 bg-purple-100/90 px-3 py-1.5 text-xs font-semibold text-purple-700"

export default function SettingsPage() {
  const { prefs } = useTeacherPrefs()
  const router = useRouter()
  const { t, locale } = useLocale()
  const signatureLines = [prefs.signatureLine1, prefs.signatureLine2, prefs.signatureLine3].filter(
    Boolean,
  )
  const [isSaving, setIsSaving] = useState(false)
  const languageLabel = getLanguageLabel(locale, prefs.preferredLanguage)

  const handleReturn = () => {
    if (isSaving) return
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      router.push("/")
    }, 400)
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 opacity-80 pointer-events-none" />
      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-20 pb-32 md:px-6 lg:px-8 md:pt-24">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.4em] text-purple-300">{t("settings.preferences.tagline")}</p>
          <h1 className="text-5xl font-semibold leading-tight">{t("settings.preferences.title")}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">{t("settings.preferences.description")}</p>
        </div>

        <div className="flex justify-start">
          <Button onClick={handleReturn} className={backToDraftButtonClasses} disabled={isSaving}>
            <ArrowLeft className="h-4 w-4" />
            {isSaving ? t("saving") : t("settings.backToDraft")}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className={LOCKED_CARD}>
            <div className="absolute top-4 right-4">
              <div className={LOCKED_BADGE}>
                <LockKeyhole className="h-3 w-3" />
                {t("settings.lockedBadge")}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-gray-700">{t("settings.cards.toneDefaults.title")}</p>
              <p className="mb-4 text-3xl font-bold text-gray-900">{prefs.preferredTone}</p>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">{t("settings.cards.toneDefaults.description")}</p>
          </Card>

          <Card className={`${INTERACTIVE_CARD} focus-visible:ring-offset-2`} tabIndex={0} role="button">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-700">
                  {t("settings.cards.language.title")}
                </p>
                <p className="mb-2 text-3xl font-bold text-gray-900">
                  {languageLabel}
                </p>
              </div>
              <ChevronRight
                className="h-5 w-5 text-gray-700 transition-colors duration-300 group-hover:text-gray-900"
                aria-hidden
              />
            </div>
            <p className="text-sm leading-relaxed text-gray-700">{t("settings.cards.language.description")}</p>
          </Card>

          <Card className={LOCKED_CARD}>
            <div className="absolute top-4 right-4">
              <div className={LOCKED_BADGE}>
                <LockKeyhole className="h-3 w-3" />
                {t("settings.lockedBadge")}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-700">
                  {t("settings.cards.signature.title")}
                </p>
                <p className="mb-4 text-3xl font-bold text-gray-900">
                  {t("settings.cards.signature.preview")}
                </p>
              </div>
              <PenTool className="h-5 w-5 text-gray-700" aria-hidden />
            </div>
            <div className="rounded-2xl border-2 border-dashed border-purple-300/50 bg-purple-50/60 p-6 shadow-inner">
              {signatureLines.length ? (
                <div className="space-y-1 font-[cursive] text-lg font-semibold leading-relaxed text-purple-700">
                  {signatureLines.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-purple-600">{t("settings.cards.signature.empty")}</p>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {t("settings.cards.signature.description")}
            </p>
          </Card>

          <Card className={SAFEGUARD_CARD}>
            <div className="flex items-center gap-2 text-gray-900">
              <Shield className="h-5 w-5 text-blue-500" />
              <p className="text-xs font-semibold tracking-wider text-gray-900">
                {t("settings.cards.safeguard.title")}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-3xl font-bold text-gray-900">{t("settings.cards.safeguard.subhead")}</p>
              <Info className="h-5 w-5 text-gray-900" />
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-800">
              {["settings.cards.safeguard.list.1", "settings.cards.safeguard.list.2", "settings.cards.safeguard.list.3"].map(
                (key) => (
                  <li key={key}>{t(key)}</li>
                ),
              )}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">{t("settings.cards.safeguard.footer")}</p>
          </Card>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/10 p-4 text-sm leading-relaxed text-white/80">
          <p>{t("settings.preferences.footerNote")}</p>
        </div>
      </div>
      <div className="fixed bottom-8 right-8 z-40">
        <Button onClick={handleReturn} className={backToDraftButtonClasses} disabled={isSaving}>
          <ArrowLeft className="h-4 w-4" />
          {isSaving ? t("saving") : t("settings.backToDraft")}
        </Button>
      </div>
      <FooterSlim />
    </div>
  )
}
