"use client"

import { useState } from "react"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useLocale } from "@/hooks/use-locale"

interface InstantDraftResponse {
  success?: boolean
  limitReached?: boolean
  data?: {
    rewrittenText?: string
    modeUsed?: "parent_message" | "report_comment"
    limitReached?: boolean
  }
  error?: {
    code?: string
    message?: string
  }
}

interface InstantDraftTestProps {
  onCreateAccount: () => void
}

export function InstantDraftTest({ onCreateAccount }: InstantDraftTestProps) {
  const { locale, t } = useLocale()
  const [message, setMessage] = useState("")
  const [rewrittenText, setRewrittenText] = useState<string | null>(null)
  const [modeUsed, setModeUsed] = useState<"parent_message" | "report_comment" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  const handleRewrite = async () => {
    const trimmed = message.trim()
    if (!trimmed || isSubmitting || limitReached) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/marketing/instant-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          language: locale.startsWith("de") ? "de" : "en",
        }),
      })

      const payload = (await response.json().catch(() => null)) as InstantDraftResponse | null

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t("auth.instant.error"))
        setLimitReached(Boolean(payload?.limitReached))
        return
      }

      setRewrittenText(payload.data?.rewrittenText ?? "")
      setModeUsed(payload.data?.modeUsed ?? null)
      setLimitReached(Boolean(payload.data?.limitReached))
    } catch {
      setError(t("auth.instant.error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="glass border-white/24 bg-white/[0.16] text-white shadow-[0_24px_56px_rgba(15,23,42,0.22)] backdrop-blur-[24px]">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="rounded-full border border-white/18 bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/95">
            {t("auth.instant.badge")}
          </Badge>
          <div className="flex items-center gap-2 text-xs font-medium text-white/78">
            <ShieldCheck className="h-4 w-4" />
            <span>{t("auth.instant.limitHint")}</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-white">
          {t("auth.instant.title")}
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-7 text-white/86">
          {t("auth.instant.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/18 bg-slate-950/16 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("auth.instant.placeholder")}
            className="min-h-40 resize-y rounded-xl border-white/25 bg-white/96 text-slate-900 placeholder:text-slate-400"
            disabled={isSubmitting || limitReached}
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-white/76">
              {t("auth.instant.privacyHint")}
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleRewrite}
              loading={isSubmitting}
              disabled={!message.trim() || limitReached}
              rightIcon={<Sparkles className="h-4 w-4" />}
              className="min-w-[12rem] rounded-xl bg-white text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:bg-white/96"
            >
              {t("auth.instant.button")}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200/35 bg-rose-500/12 p-4 text-sm text-rose-50">
            {error}
          </div>
        ) : null}

        {rewrittenText ? (
          <div className="space-y-3 rounded-2xl border border-white/28 bg-white/95 p-4 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{t("auth.instant.resultTitle")}</p>
              {modeUsed ? (
                <Badge variant="secondary" className="rounded-full bg-purple-100 text-purple-700">
                  {modeUsed === "report_comment"
                    ? t("editor.mode.reportComment")
                    : t("editor.mode.parentMessage")}
                </Badge>
              ) : null}
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              {rewrittenText.split(/\n{2,}/).map((paragraph, index) => (
                <p
                  key={`instant-draft-paragraph-${index}`}
                  className="whitespace-pre-wrap text-sm leading-7 text-slate-700"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {limitReached ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200/30 bg-emerald-500/14 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{t("auth.instant.ctaTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/82">
                {t("auth.instant.ctaDescription")}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onCreateAccount}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="bg-white text-gray-900 hover:bg-white/90"
            >
              {t("auth.instant.createAccount")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
