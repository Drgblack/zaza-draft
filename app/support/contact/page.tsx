 "use client"

import { useState, type FormEvent } from "react"
import { useLocale } from "@/hooks/use-locale"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

export default function SupportContactPage() {
  const { t } = useLocale()
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "submitted">("idle")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!subject.trim() || !details.trim()) {
      return
    }
    setStatus("sending")
    window.setTimeout(() => {
      setStatus("submitted")
      setSubject("")
      setDetails("")
    }, 600)
  }

  const helperText =
    status === "submitted"
      ? t("support.contact.submitted")
      : t("support.contact.helper")

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/support" className="inline-flex items-center gap-2 text-sm text-white hover:text-white/70 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("account.backToApp")}
        </Link>

        <div className="bg-white/95 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("support.contact.title")}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("support.contact.description")}</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("support.contact.subjectLabel")}
              </label>
              <Input
                placeholder={t("support.contact.subjectPlaceholder")}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("support.contact.detailsLabel")}
              </label>
              <Textarea
                placeholder={t("support.contact.detailsPlaceholder")}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={5}
                className="mt-2"
              />
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">{helperText}</p>

            <Button type="submit" className="w-full" disabled={status === "sending"} variant="secondary">
              {status === "sending" ? "Sending…" : "Send request"}
            </Button>
          </form>

          {status === "submitted" && (
            <div className="mt-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 px-4 py-3 text-sm">
              {t("support.contact.submittedMessage")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
