"use client"

import Link from "next/link"

import { ArrowLeft, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/hooks/use-locale"

export default function SupportContactPage() {
  const { t } = useLocale()

  return (
    <div className="bg-white dark:bg-slate-950 text-gray-900 dark:text-white min-h-full">
      <section className="bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 dark:from-purple-900 dark:via-purple-800 dark:to-pink-900 text-white">
        <main
          className="container mx-auto max-w-4xl space-y-6 px-4 py-8"
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
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {t("support.contact.primaryAction")}
                </Button>
              </Link>
              <a
                data-testid="support-contact-email-link"
                href="mailto:support@zazatechnologies.com"
                className="inline-flex items-center justify-center rounded-md border border-white/80 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/80 dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                {t("support.emailCta")}
              </a>
            </div>
          </div>
        </main>
      </section>
      <div className="bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-4xl px-4 pb-10" aria-hidden="true" />
      </div>
    </div>
  )
}




