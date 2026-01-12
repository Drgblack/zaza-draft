"use client"

import Link from "next/link"

import { useLocale } from "@/hooks/use-locale"
import FooterSlim from "@/components/FooterSlim"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function CommunityPage() {
  const { t } = useLocale()

  const points = [t("community.point1"), t("community.point2"), t("community.point3")]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 text-white">
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6" data-testid="community-main">
        <Link href="/support">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("support.title")}
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold">{t("community.title")}</h1>
          <p className="text-lg text-white/80">{t("community.description")}</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-white/70">{t("community.comingSoon")}</p>
          <ul className="list-disc space-y-2 pl-5 text-white/80">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/support/contact">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              {t("support.contact.heading")}
            </Button>
          </Link>
          <Link href="/guides">
            <Button className="border border-white/40 bg-white/10 text-white hover:bg-white/20">
              {t("guides.title")}
            </Button>
          </Link>
        </div>
      </main>
      <FooterSlim />
    </div>
  )
}
