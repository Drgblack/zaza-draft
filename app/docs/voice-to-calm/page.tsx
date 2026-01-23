"use client"

import FooterSlim from "@/components/FooterSlim"
import Link from "next/link"
import { useLocale } from "@/hooks/use-locale"

export default function DocsVoiceSpecPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-black text-white">
      <main className="flex-1">
        <div className="mx-auto flex min-h-[calc(100vh-220px)] max-w-4xl flex-col space-y-6 px-4 py-16">
          <div className="flex flex-col gap-2">
            <Link href="/docs" className="text-sm font-semibold text-white/80 underline">
              {t("docsSpecBackLink")}
            </Link>
            <h1 className="text-4xl font-semibold">{t("docsVoiceSpecTitle")}</h1>
            <p className="text-lg text-white/80">{t("docsVoiceSpecOverview")}</p>
          </div>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsVoiceSpecRecording")}</h2>
            <p className="mt-2 text-sm">{t("docsVoiceSpecRecordingDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsVoiceSpecProcessing")}</h2>
            <p className="mt-2 text-sm">{t("docsVoiceSpecProcessingDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsVoiceSpecPrivacy")}</h2>
            <p className="mt-2 text-sm">{t("docsVoiceSpecPrivacyDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsVoiceSpecFailureModes")}</h2>
            <p className="mt-2 text-sm">{t("docsVoiceSpecFailureModesDetail")}</p>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80 shadow-lg shadow-black/40">
            <h2 className="text-2xl font-semibold text-white">{t("docsVoiceSpecConfig")}</h2>
            <p className="mt-2 text-sm">{t("docsVoiceSpecConfigDetail")}</p>
          </section>
        </div>
      </main>
      <FooterSlim />
    </div>
  )
}
