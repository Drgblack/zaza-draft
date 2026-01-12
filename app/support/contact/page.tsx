"use client"

import Link from "next/link"

import { ArrowLeft, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/use-locale"

export default function SupportContactPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 text-white">
      <main
        className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-6"
        data-testid="support-contact-main"
      >
        <Link href="/support" className="inline-flex">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("support.back")}
          </Button>
        </Link>

        <div>
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-white/90" />
            <h1 className="text-4xl font-bold text-white" data-testid="support-contact-heading">
              {t("support.contact.heading")}
            </h1>
          </div>
          <p className="text-lg text-white/80">{t("support.contact.body")}</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-white/70">{t("support.contact.description")}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact">
              <Button
                data-testid="support-contact-primary"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {t("support.contact.primaryAction")}
              </Button>
            </Link>
            <Button
              asChild
              variant="outline"
              className="border-white/80 text-white hover:bg-white/10"
              data-testid="support-contact-secondary"
            >
              <a href="mailto:support@zazatechnologies.com">
                {t("support.contact.secondaryAction")}
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
