"use client"

import Link from "next/link"
import FooterSlim from "@/components/FooterSlim"
import { useLocale } from "@/hooks/use-locale"

export default function DocsPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white">
      <div className="mx-auto flex min-h-[calc(100vh-220px)] animate-fade-in flex-col space-y-6 px-4 py-16">
        <h1 className="text-4xl font-semibold">{t("docsTitle")}</h1>
        <p className="max-w-2xl text-lg text-white/80">{t("docsDescription")}</p>
        <Link
          href="/docs"
          className="inline-flex w-fit rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-indigo-100 shadow-lg shadow-indigo-950/40 hover:bg-white/20 transition"
        >
          {t("docsLinkLabel")}
        </Link>
        <div className="space-y-4">
          <section
            id="panic-scan"
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/40"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              {t("docsSectionLabelInput")}
            </p>
            <h2 className="text-2xl font-semibold text-white">{t("docsSectionPanicScanTitle")}</h2>
            <p className="text-sm text-white/70">{t("docsSectionPanicScanDescription")}</p>
            <Link
              href="/docs#panic-scan"
              className="text-sm font-semibold text-indigo-300 underline"
            >
              {t("docsLinkLabel")}
            </Link>
          </section>
          <section
            id="voice-to-calm"
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/40"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              {t("docsSectionLabelInput")}
            </p>
            <h2 className="text-2xl font-semibold text-white">{t("docsSectionVoiceTitle")}</h2>
            <p className="text-sm text-white/70">{t("docsSectionVoiceDescription")}</p>
            <Link
              href="/docs#voice-to-calm"
              className="text-sm font-semibold text-indigo-300 underline"
            >
              {t("docsLinkLabel")}
            </Link>
          </section>
        </div>
        <div className="mt-auto">
          <FooterSlim />
        </div>
      </div>
    </div>
  )
}


