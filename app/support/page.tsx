"use client"

import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Book, Mail, MessageCircle } from "lucide-react"
import Link from "next/link"

export default function SupportPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("account.backToApp")}
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">{t("support.title")}</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <Book className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
              <CardTitle className="text-gray-900 dark:text-white">{t("support.guides.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("support.guides.description")}</CardDescription>
            </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary" asChild>
              <Link href="/support/guides">{t("support.guides.button")}</Link>
            </Button>
          </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20">
            <CardHeader>
              <MessageCircle className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
              <CardTitle className="text-gray-900 dark:text-white">{t("support.community.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("support.community.description")}</CardDescription>
            </CardHeader>
          <CardContent>
            <Button className="w-full" variant="ghost" asChild>
              <Link href="/support/community">{t("support.community.button")}</Link>
            </Button>
          </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 md:col-span-2">
            <CardHeader>
              <Mail className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
              <CardTitle className="text-gray-900 dark:text-white">{t("support.contact.title")}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t("support.contact.description")}</CardDescription>
            </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/support/contact">{t("support.contact.button")}</Link>
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
