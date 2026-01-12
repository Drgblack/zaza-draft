"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import FooterSlim from "@/components/FooterSlim"
import { useLocale } from "@/hooks/use-locale"

export default function DraftingTipsGuide() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 text-white">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Link href="/guides" className="inline-flex">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            {t("guides.common.backLabel")}
          </Button>
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">{t("guides.draftingTips.title")}</h1>
          <p className="text-lg text-white/80">{t("guides.draftingTips.intro")}</p>
          <ul className="space-y-3 text-white/90 list-disc list-inside">
            <li>{t("guides.draftingTips.bullet1")}</li>
            <li>{t("guides.draftingTips.bullet2")}</li>
            <li>{t("guides.draftingTips.bullet3")}</li>
          </ul>
          <div className="bg-white/10 border border-white/40 rounded-xl p-4 space-y-3 text-sm">
            <p className="font-semibold">{t("guides.draftingTips.examplesTitle")}</p>
            <p className="text-white/90">{t("guides.draftingTips.example1")}</p>
            <p className="text-white/90">{t("guides.draftingTips.example2")}</p>
          </div>
        </div>
      </main>
      <FooterSlim />
    </div>
  )
}
