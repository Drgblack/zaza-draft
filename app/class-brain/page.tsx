"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useTeacherPrefs } from "@/hooks/use-teacher-prefs"

const STORAGE_KEY = "classBrainContext"

export default function ClassBrainPage() {
  const { prefs } = useTeacherPrefs()
  const [context, setContext] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")
  const teacherName = prefs.firstName

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setContext(stored)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, context)
    setSaveStatus("saved")
    window.setTimeout(() => setSaveStatus("idle"), 2200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-slate-900">
      <div className="container relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/70">Class Brain</p>
            <h1 className="text-4xl font-semibold">Build your class brain</h1>
          </div>
          <Link href="/" className="rounded-full border border-white/50 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Back to Draft
          </Link>
        </div>

        <p className="max-w-3xl text-sm text-white/70">
          Class Brain lets you store safe, evergreen student context so the assistant understands{" "}
          {teacherName}&apos;s classroom before you start writing. Share the high-level wins, the goals,
          and the tone you need for this group.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/10 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-white">What it is</h2>
            <p className="mt-3 text-sm text-white/80">
              A lightweight knowledge base for the students and focus areas you teach most. Class
              Brain keeps this context nearby so every generation understands your classroom stage.
            </p>
            <p className="mt-4 text-sm text-white/70">
              Match the right tone and scaffold wording without repeating the same setup every time.
            </p>
          </Card>

          <Card className="bg-white/10 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-white">What to add</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>• Grade level or course you are writing for.</li>
              <li>• Classroom mood, pacing, or recurring themes.</li>
              <li>• Student goals (e.g., mastering a standard or improving confidence).</li>
            </ul>
          </Card>

          <Card className="bg-white/10 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-white">What NOT to add</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>• No full names, student IDs, or contact info.</li>
              <li>• Avoid medical details, disciplinary notes, or sensitive data.</li>
              <li>• Skip personal opinions about individuals.</li>
            </ul>
          </Card>

          <Card className="bg-white/10 shadow-lg shadow-black/40">
            <h2 className="text-lg font-semibold text-white">Your saved context</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
              Safe, editable, and stored locally
            </p>
            <div className="mt-4 space-y-2">
              <Textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Describe the key class context you want the assistant to remember."
                className="bg-white/80 text-sm text-gray-900 placeholder:text-gray-500"
                rows={5}
              />
              <p className="text-xs text-white/70">
                Save a short reminder (no names) that sets up the next writing session.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 text-white" onClick={handleSave}>
                Save context
              </Button>
              {saveStatus === "saved" && <span className="text-sm text-emerald-300">Saved locally</span>}
            </div>
          </Card>
        </div>

        <p className="text-xs text-white/60">
          Saved context stays on this device unless you copy it to a shared document. The safe
          guidelines above keep sensitive details out of Class Brain.
        </p>
      </div>
    </div>
  )
}
