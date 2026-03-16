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
    <Card className="glass border-white/20 bg-white/12 text-white shadow-soft-lg">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
            {t("auth.instant.badge")}
          </Badge>
          <div className="flex items-center gap-2 text-xs font-medium text-white/70">
            <ShieldCheck className="h-4 w-4" />
            <span>{t("auth.instant.limitHint")}</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-white">
          {t("auth.instant.title")}
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-relaxed text-white/75">
          {t("auth.instant.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/15 bg-black/10 p-4 shadow-soft-inset">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("auth.instant.placeholder")}
            className="min-h-40 resize-y border-white/15 bg-white/90 text-gray-900 placeholder:text-gray-500"
            disabled={isSubmitting || limitReached}
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-white/65">
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
              className="min-w-[12rem]"
            >
              {t("auth.instant.button")}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-300/35 bg-rose-500/10 p-4 text-sm text-rose-50">
            {error}
          </div>
        ) : null}

        {rewrittenText ? (
          <div className="space-y-3 rounded-2xl border border-white/15 bg-white/90 p-4 text-gray-900 shadow-soft">
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
            <div className="space-y-3 rounded-xl border border-purple-100 bg-white p-4">
              {rewrittenText.split(/\n{2,}/).map((paragraph, index) => (
                <p
                  key={`instant-draft-paragraph-${index}`}
                  className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {limitReached ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{t("auth.instant.ctaTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
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
