"use client"

import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const COMMUNITY_ROUTES = [
  {
    title: "Weekly reflection circles",
    detail: "Share classroom wins, request feedback, and celebrate mindset moments with colleagues.",
  },
  {
    title: "Resource swaps",
    detail: "Upload a template or excerpt and invite others to remix it for their classroom.",
  },
  {
    title: "Ask the makers",
    detail: "Directly flag policy, scope, or accessibility questions for the Zaza Draft team to review.",
  },
]

export default function SupportCommunityPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/support" className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("account.backToApp")}
        </Link>
        <h1 className="text-4xl font-bold text-white mb-4">{t("support.community.title")}</h1>
        <p className="text-white/80 mb-8">{t("support.community.description")}</p>

        <div className="grid gap-4">
          {COMMUNITY_ROUTES.map((route) => (
            <div
              key={route.title}
              className="bg-white/90 dark:bg-white/10 text-gray-900 dark:text-white rounded-2xl px-6 py-5 shadow-lg border border-white/40 dark:border-white/20"
            >
              <h2 className="text-xl font-semibold mb-2">{route.title}</h2>
              <p className="text-sm leading-relaxed">{route.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild className="w-full sm:w-auto" variant="outline">
            <Link href="/support/contact">{t("support.contact.button")}</Link>
          </Button>
          <span className="text-white/80 text-sm sm:pl-4">
            Join the conversation and let us know what you need most.
          </span>
        </div>
      </div>
    </div>
  )
}
