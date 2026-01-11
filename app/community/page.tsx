"use client"

import Link from "next/link"

import { useLocale } from "@/hooks/use-locale"
import FooterSlim from "@/components/FooterSlim"
import { Button } from "@/components/ui/button"

export default function CommunityPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Link href="/support">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            ← {t("support.title")}
          </Button>
        </Link>
        <h1 className="text-4xl font-bold">{t("community.title")}</h1>
        <p className="text-lg text-white/80">{t("community.description")}</p>
        <div>
          <Link href="/support">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              {t("community.back")}
            </Button>
          </Link>
        </div>
      </div>
      <FooterSlim />
    </div>
  )
}
