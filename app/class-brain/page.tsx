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
import { backToDraftButtonClasses } from "@/lib/ui/back-to-draft"

const STORAGE_KEY = "classBrainContext"

export default function ClassBrainPage() {
  const { prefs } = useTeacherPrefs()
  const [context, setContext] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const { toast } = useToast()
  const teacherName = prefs.firstName
  const maxCharacters = 500
  const characterCount = context.length
  const wordCount = context.trim() ? context.trim().split(/\s+/).length : 0
  const tooltipMessage =
    "Class Brain keeps this classroom context in the browser so the assistant understands your goals without storing anything sensitive."
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
      title: "Context saved",
      description: "Class Brain remembers this locally for your next session.",
    })
    window.setTimeout(() => setSaveStatus("idle"), 2200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-slate-900">
      <div className="container relative mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 text-white">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/70">Class Brain</p>
              <h1 className="flex items-center gap-2 text-4xl font-semibold">
                Build your class brain
              </h1>
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
              <ArrowLeft className="h-4 w-4" />
              Back to Draft
            </Link>
          </Button>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-white/70">
          Class Brain lets you store safe, evergreen student context so the assistant understands{" "}
          {teacherName}&apos;s classroom before you start writing. Share the high-level wins, the goals,
          and the tone you need for this group.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">What it is</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              A lightweight knowledge base for the students and focus areas you teach most. Class
              Brain keeps this context nearby so every generation understands your classroom stage.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Match the right tone and scaffold wording without repeating the same setup every time.
            </p>
          </Card>

          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">What to add</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-white/80">
              <li>• Grade level or course you are writing for.</li>
              <li>• Classroom mood, pacing, or recurring themes.</li>
              <li>• Student goals (e.g., mastering a standard or improving confidence).</li>
            </ul>
          </Card>

          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white">What NOT to add</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-white/80">
              <li>• No full names, student IDs, or contact info.</li>
              <li>• Avoid medical details, disciplinary notes, or sensitive data.</li>
              <li>• Skip personal opinions about individuals.</li>
            </ul>
          </Card>

          <Card className="rounded-2xl border border-white/20 bg-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-300 backdrop-blur-sm hover:shadow-3xl hover:scale-[1.01]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Your saved context</h2>
              <span className="flex items-center gap-2 rounded-full border border-purple-300/50 bg-purple-500/30 px-4 py-1.5 text-xs font-semibold text-white/90">
                <Shield className="h-4 w-4 text-white/80" />
                Stored locally
              </span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
              Safe, editable, and stored locally
            </p>
            <div className="mt-4 space-y-3">
              <Textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="e.g., 'AP Biology class focused on cellular respiration. Students are preparing for state exam in May. Class mood is engaged but slightly anxious.'"
                className="min-h-[150px] rounded-2xl border-2 border-white/30 bg-white/10 p-4 text-sm leading-relaxed text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                rows={5}
                maxLength={maxCharacters}
              />
              <p className="text-xs leading-relaxed text-white/70">
                Save a short reminder (no names) that sets up the next writing session.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80">
                {`${Math.min(characterCount, maxCharacters)}/${maxCharacters} characters`}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80">
                {`${wordCount} words`}
              </span>
            </div>
            {lastSavedAt && (
              <p className="mt-2 flex items-center gap-2 text-xs text-emerald-200">
                {showSavedIcon && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 animate-pulse" aria-hidden />
                )}
                <span>
                  Last saved:{" "}
                  {lastSavedAt.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            )}
            <div className="mt-4">
              <Button
                className="w-full justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-purple-900/40 transition-all duration-200 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-400/50 active:scale-95 focus-visible:ring-2 focus-visible:ring-purple-400"
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                Save context
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-purple-900/30 p-4 text-sm leading-relaxed text-white/80">
          <p>
            Saved context stays on this device unless you copy it to a shared document. The safe
            guidelines above keep sensitive details out of Class Brain.
          </p>
        </div>
      </div>
    </div>
  )
}
