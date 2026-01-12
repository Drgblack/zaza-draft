"use client"

import Link from "next/link"

import { useLocale } from "@/hooks/use-locale"
import FooterSlim from "@/components/FooterSlim"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function GuidesPage() {
  const { t } = useLocale()

  const guides = [
    {
      title: t("guides.card1.title"),
      description: t("guides.card1.description"),
      href: "/",
    },
    {
      title: t("guides.card2.title"),
      description: t("guides.card2.description"),
      href: "/insights",
    },
    {
      title: t("guides.card3.title"),
      description: t("guides.card3.description"),
      href: "/privacy",
    },
    {
      title: t("guides.card4.title"),
      description: t("guides.card4.description"),
      href: "/support/contact",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 text-white">
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6" data-testid="guides-main">
        <Link href="/support">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("support.title")}
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold">{t("guides.title")}</h1>
          <p className="text-lg text-white/80">{t("guides.description")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2" data-testid="guides-card-grid">
          {guides.map((guide) => (
            <Card
              key={guide.title}
              className="bg-white/90 text-slate-900 dark:bg-white/10 dark:text-white border border-white/40 shadow-lg"
            >
              <CardHeader>
                <CardTitle>{guide.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{guide.description}</CardDescription>
                <div className="mt-4">
                  <Link href={guide.href}>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      {t("support.guides.button")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <FooterSlim />
    </div>
  )
}
