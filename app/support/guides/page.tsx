"use client"

import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const GUIDE_COLLECTION = [
  {
    title: "Parent communication templates",
    description:
      "Start with proven introductory, progress, and celebration notes that keep families informed without extra effort.",
    steps: ["Open the parent newsletter kit", "Pick the tone that matches your classroom culture", "Tailor the template to the current topic"],
  },
  {
    title: "Classroom routines & wellbeing",
    description:
      "Handle behaviour observations, wellbeing check-ins, and attendance reflections with gentle, relational language that keeps students safe.",
    steps: ["Review the wellbeing sentence bank", "Add student names and context", "Share with families or colleagues"],
  },
  {
    title: "Lesson reflections & cross-class notes",
    description:
      "Document highlights from literacy, maths, or science units using structured prompts so you can pass insights to colleagues or leadership.",
    steps: ["Use the lesson summary outline", "Call out next steps or support needs", "Save or share the note"],
  },
]

export default function SupportGuidesPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("account.backToApp")}
        </Link>

        <h1 className="text-4xl font-bold text-white mb-6">{t("support.guides.title")}</h1>
        <p className="text-white/80 mb-10 max-w-2xl">{t("support.guides.description")}</p>

        <div className="grid gap-6">
          {GUIDE_COLLECTION.map((guide) => (
            <article
              key={guide.title}
              className="bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-2xl p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">{guide.title}</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{guide.description}</p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-200 space-y-1">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="w-full sm:w-auto" variant="outline" asChild>
            <Link href="/support/contact">{t("support.contact.button")}</Link>
          </Button>
          <p className="text-white/80 text-sm sm:pl-4">
            Prefer live help? Send a quick note and we will respond inside the app.
          </p>
        </div>
      </div>
    </div>
  )
}
