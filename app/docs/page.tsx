"use client"

import { useEffect } from "react"
import FooterSlim from "@/components/FooterSlim"
import Link from "next/link"
import { useLocale } from "@/hooks/use-locale"

export default function DocsPage() {
  const { t } = useLocale()

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash
      if (!hash) {
        return
      }
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }

    scrollToHash()
    window.addEventListener("hashchange", scrollToHash)
    return () => window.removeEventListener("hashchange", scrollToHash)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-black text-white">
      <main className="flex-1">
        <div className="mx-auto flex min-h-[calc(100vh-220px)] max-w-4xl flex-col space-y-6 px-4 py-16">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">{t("docsTitle")}</h1>
              <p className="max-w-2xl text-lg text-white/80">{t("docsDescription")}</p>
            </div>
            <Link
              href="/"
              className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white"
            >
              {t("panicScanBackLink")}
            </Link>
          </div>
          <Link
            href="/docs#panic-scan"
            scroll={false}
            className="inline-flex w-fit rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-indigo-100 shadow-lg shadow-indigo-950/40 hover:bg-white/20 transition"
          >
            {t("docsLinkLabel")}
          </Link>

          <div className="space-y-4 relative z-10">
            <section
              id="panic-scan"
              className="scroll-mt-20 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/40"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {t("docsSectionLabelInput")}
              </p>
              <h2 className="text-2xl font-semibold text-white">{t("docsSectionPanicScanTitle")}</h2>
              <p className="text-sm text-white/70">{t("docsSectionPanicScanDescription")}</p>
              <Link
                href="/docs#panic-scan"
                scroll={false}
                className="text-sm font-semibold text-indigo-300 underline"
              >
                {t("docsLinkLabel")}
              </Link>
            </section>
            <section
              id="voice-to-calm"
              className="scroll-mt-20 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/40"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {t("docsSectionLabelInput")}
              </p>
              <h2 className="text-2xl font-semibold text-white">{t("docsSectionVoiceTitle")}</h2>
              <p className="text-sm text-white/70">{t("docsSectionVoiceDescription")}</p>
              <Link
                href="/docs#voice-to-calm"
                scroll={false}
                className="text-sm font-semibold text-indigo-300 underline"
              >
                {t("docsLinkLabel")}
              </Link>
            </section>
          </div>
        </div>
      </main>
      <FooterSlim />
    </div>
  )
}
