"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Info, Save, CheckCircle2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"
import { useToast } from "@/hooks/use-toast"
import { useLocale } from "@/hooks/use-locale"
import { backToDraftButtonClasses } from "@/lib/ui/back-to-draft"

const STORAGE_KEY = "classBrainContext"
const WHAT_TO_ADD_KEYS = ["classBrain.add.grade", "classBrain.add.mood", "classBrain.add.goals"]
const WHAT_NOT_TO_ADD_KEYS = [
  "classBrain.notAdd.noNames",
  "classBrain.notAdd.noSensitive",
  "classBrain.notAdd.noOpinions",
]

export default function ClassBrainPage() {
  const { prefs } = useTeacherPrefs()
  const [context, setContext] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const { toast } = useToast()
  const { t } = useLocale()
  const teacherName = prefs.firstName
  const maxCharacters = 500
  const characterCount = context.length
  const wordCount = context.trim() ? context.trim().split(/\s+/).length : 0
  const tooltipMessage = t("classBrain.tooltip")
  const showSavedIcon = saveStatus === "saved"

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setContext(stored)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, context)
    const now = new Date()
    setLastSavedAt(now)
    setSaveStatus("saved")
    toast({
      title: t("classBrain.toast.title"),
      description: t("classBrain.toast.description"),
    })
    window.setTimeout(() => setSaveStatus("idle"), 2200)
  }

  const formattedLastSaved =
    lastSavedAt &&
    t("classBrain.lastSaved", {
      time: lastSavedAt.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-slate-900">
      <div className="container relative mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 text-white">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">{t("classBrain.label")}</p>
              <h1 className="flex items-center gap-2 text-4xl font-semibold">{t("classBrain.title")}</h1>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-5 w-5 text-purple-200 transition-transform duration-200 hover:scale-110 hover:text-white" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">{tooltipMessage}</TooltipContent>
            </Tooltip>
          </div>
          <Button asChild className={`${backToDraftButtonClasses} ml-auto`}>
            <Link href="/">
              <span className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("classBrain.backToDraft")}
              </span>
            </Link>
          </Button>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-white/70">
          {t("classBrain.description", { name: teacherName })}
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">{t("classBrain.sections.whatItIs.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{t("classBrain.sections.whatItIs.body")}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{t("classBrain.sections.whatItIs.subtext")}</p>
          </Card>

          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">{t("classBrain.sections.whatToAdd.title")}</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-white/80">
              {WHAT_TO_ADD_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">{t("classBrain.sections.whatNotToAdd.title")}</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-white/80">
              {WHAT_NOT_TO_ADD_KEYS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm hover:shadow-3xl hover:scale-[1.01]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{t("classBrain.savedContext.title")}</h2>
              <span className="flex items-center gap-2 rounded-full border border-purple-300/50 bg-purple-500/30 px-4 py-1.5 text-xs font-semibold text-white/90">
                <Shield className="h-4 w-4 text-white/80" />
                {t("classBrain.savedContext.storedLocally")}
              </span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/60">{t("classBrain.savedContext.tagline")}</p>
            <div className="mt-4 space-y-3">
              <Textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder={t("classBrain.textarea.placeholder")}
                className="min-h-[150px] rounded-2xl border-2 border-white/30 bg-white/10 p-4 text-sm leading-relaxed text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                rows={5}
                maxLength={maxCharacters}
              />
              <p className="text-xs leading-relaxed text-white/70">{t("classBrain.textarea.helper")}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80">
                {t("classBrain.stats.characters", { count: Math.min(characterCount, maxCharacters), max: maxCharacters })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80">
                {t("classBrain.stats.words", { count: wordCount })}
              </span>
            </div>
            {lastSavedAt && (
              <p className="mt-2 flex items-center gap-2 text-xs text-emerald-200">
                {showSavedIcon && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 animate-pulse" aria-hidden />
                )}
                <span>{formattedLastSaved}</span>
              </p>
            )}
            <div className="mt-4">
              <Button
                className="w-full justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-purple-900/40 transition-all duration-200 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-400/50 active:scale-95 focus-visible:ring-2 focus-visible:ring-purple-400"
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                {t("classBrain.saveContext")}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-purple-900/30 p-4 text-sm leading-relaxed text-white/80">
          <p>{t("classBrain.footerNote")}</p>
        </div>
      </div>
    </div>
  )
}
