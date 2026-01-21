"use client"

import FooterSlim from "@/components/FooterSlim"
import Link from "next/link"
import { useLocale } from "@/hooks/use-locale"

export default function DocsPanicScanSpecPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-black text-white">
      <main className="flex-1">
        <div className="mx-auto flex min-h-[calc(100vh-220px)] max-w-4xl flex-col space-y-6 px-4 py-16">
          <div className="flex flex-col gap-2">
            <Link href="/docs#panic-scan" className="text-sm font-semibold text-white/80 underline">
              {t("docsSpecBackLink")}
            </Link>
            <h1 className="text-4xl font-semibold">{t("docsPanicSpecTitle")}</h1>
            <p className="text-lg text-white/80">{t("docsPanicSpecOverview")}</p>
          </div>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsPanicSpecInputs")}</h2>
            <p className="mt-2 text-sm">{t("docsPanicSpecInputsDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsPanicSpecProcessing")}</h2>
            <p className="mt-2 text-sm">{t("docsPanicSpecProcessingDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsPanicSpecPrivacy")}</h2>
            <p className="mt-2 text-sm">{t("docsPanicSpecPrivacyDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsPanicSpecFailureModes")}</h2>
            <p className="mt-2 text-sm">{t("docsPanicSpecFailureModesDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsPanicSpecConfig")}</h2>
            <p className="mt-2 text-sm">{t("docsPanicSpecConfigDetail")}</p>
          </section>
        </div>
      </main>
      <FooterSlim />
    </div>
  )
}
