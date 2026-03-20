"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { logClientEvent } from "@/lib/analytics"
import { InstantDraftTest } from "@/components/marketing/instant-draft-test"
const GOOGLE_ERROR_MAP: Record<string, string> = {
  "auth/popup-closed-by-user": "You closed the Google window. Please try again.",
  "auth/cancelled-popup-request": "Only one Google window can be open at a time. Please refresh and try again.",
  "auth/popup-blocked": "Your browser blocked the popup. Allow popups for this site and retry.",
  "auth/unauthorized-domain":
    "This domain isn't authorized for Google sign-in. Contact the admin for help.",
}

export function AuthScreen() {
  const { status, emailLinkStatus, sendEmailLink, completeEmailLinkSignIn, signInWithGoogle } = useAuth()
  const { t } = useLocale()
  const [email, setEmail] = useState("")
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isAwaitingEmail = emailLinkStatus === "awaiting_email"
  const isProcessingEmailLink = emailLinkStatus === "processing"

  const getFriendlyEmailLinkError = (err: unknown) => {
    const code = (err as { code?: string })?.code

    switch (code) {
      case "auth/invalid-email":
        return t("auth.error.invalidEmail")
      case "auth/invalid-action-code":
      case "auth/expired-action-code":
        return t("auth.error.linkExpired")
      case "auth/unauthorized-continue-uri":
      case "auth/missing-continue-uri":
      case "auth/argument-error":
        return t("auth.error.linkConfig")
      default:
        if (err instanceof Error && err.message.includes("Email is required")) {
          return t("auth.error.invalidEmail")
        }
        if (
          err instanceof Error &&
          (err.message.includes("not configured") || err.message.includes("NEXT_PUBLIC_APP_URL"))
        ) {
          return t("auth.error.linkConfig")
        }
        return isAwaitingEmail ? t("auth.error.linkFailed") : t("auth.error.sendLinkFailed")
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    console.info("[auth] submit start", {
      flow: isAwaitingEmail ? "complete_email_link" : "send_email_link",
      email: email.trim(),
    })

    try {
      const normalizedEmail = email.trim()
      if (isAwaitingEmail) {
        await completeEmailLinkSignIn(normalizedEmail)
        logClientEvent("auth_login_success", { provider: "email_link" })
      } else {
        await sendEmailLink(normalizedEmail)
        setSuccessEmail(normalizedEmail)
      }
    } catch (err) {
      console.error("[auth] auth screen submit error", err)
      setSuccessEmail(null)
      setError(getFriendlyEmailLinkError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await signInWithGoogle()
      logClientEvent("auth_login_success", { provider: "google" })
    } catch (err) {
      const firebaseCode = (err as { code?: string })?.code
      const friendly = firebaseCode ? GOOGLE_ERROR_MAP[firebaseCode] : null
      if (friendly) {
        setError(friendly)
      } else if (err instanceof Error && err.message) {
        setError(err.message)
      } else {
        setError("Something went wrong.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#5b36a6] via-[#3b63b8] to-[#264f96] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.34))]" />
      <div className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-7 lg:pr-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/78">
              {t("auth.marketingEyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white drop-shadow-[0_16px_40px_rgba(15,23,42,0.24)] sm:text-5xl">
              {t("auth.title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/88 sm:text-[1.05rem]">
              {t("auth.description")}
            </p>
          </div>

          <InstantDraftTest onCreateAccount={() => document.getElementById("email")?.focus()} />
        </div>

        <div className="space-y-5 lg:justify-self-end lg:w-full lg:max-w-md">
          <form
            className="space-y-5 rounded-[28px] border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.16))] p-6 shadow-[0_28px_72px_rgba(15,23,42,0.28)] backdrop-blur-[28px] sm:p-7"
            onSubmit={handleSubmit}
          >
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/72">
                {isAwaitingEmail ? t("auth.emailLink.confirmTitle") : t("auth.title.signin")}
              </p>
              <p className="text-sm leading-6 text-white/82">
                {isAwaitingEmail ? t("auth.emailLink.confirmDescription") : t("auth.emailLink.helper")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-white/92">
                {t("auth.emailLabel")}
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (error) {
                    setError(null)
                  }
                }}
                placeholder="teacher@example.com"
                autoComplete="email"
                disabled={isSubmitting || isProcessingEmailLink}
                className="h-11 rounded-xl border-white/30 bg-white/95 px-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] placeholder:text-slate-400 focus-visible:border-white/50 focus-visible:ring-white/25"
              />
              <p className="text-[13px] leading-5 text-white/78">
                {isAwaitingEmail ? t("auth.emailLink.confirmHelper") : t("auth.emailLink.inputHelper")}
              </p>
            </div>

            {successEmail && !isAwaitingEmail && !error && (
              <div className="rounded-xl border border-emerald-200/35 bg-emerald-500/12 px-3 py-3 text-sm text-emerald-50">
                <p className="font-semibold">{t("auth.emailLink.successTitle")}</p>
                <p className="mt-1">{t("auth.emailLink.sent", { email: successEmail })}</p>
                <p className="mt-1 text-emerald-100/90">{t("auth.emailLink.sentHint")}</p>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-rose-200/35 bg-rose-500/12 px-3 py-2 text-sm text-rose-50">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-white text-slate-950 shadow-[0_16px_34px_rgba(15,23,42,0.24)] hover:bg-white/96"
              disabled={isSubmitting || isProcessingEmailLink}
            >
              {isProcessingEmailLink
                ? t("auth.emailLink.processing")
                : isSubmitting
                ? isAwaitingEmail
                  ? t("auth.processing.completeLink")
                  : t("auth.processing.sendLink")
                : isAwaitingEmail
                ? t("auth.cta.completeEmailLink")
                : successEmail
                ? t("auth.cta.resendLink")
                : t("auth.cta.sendLink")}
            </Button>
          </form>

          <div className="space-y-3 rounded-2xl border border-white/18 bg-white/10 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-[22px]">
            <p className="text-center text-sm font-medium text-white/84">{t("auth.orContinue")}</p>
            <Button
              variant="outline"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-white/45 bg-white/96 text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.12)] hover:bg-white hover:text-slate-950"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <span className="h-5 w-5" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="presentation" className="h-full w-full">
                  <path d="M23.5 12.27c0-.8-.07-1.57-.2-2.32H12.2v4.38h6.37c-.28 1.52-1.06 2.8-2.26 3.68v3.05h3.65c2.13-1.97 3.34-4.87 3.34-8.79z" fill="#4285F4" />
                  <path d="M12.2 24c2.97 0 5.47-.98 7.28-2.67l-3.65-3.05c-1.02.69-2.33 1.11-3.63 1.11-2.78 0-5.14-1.88-5.98-4.42H2.4v3.36C4.21 21.76 8.85 24 12.2 24z" fill="#34A853" />
                  <path d="M6.22 14.97c-.23-.69-.36-1.43-.36-2.19 0-.77.13-1.5.36-2.19V7.23H2.4C1.11 8.95.4 10.92.4 12.78c0 1.86.71 3.83 2 5.54l3.82-3.35z" fill="#FBBC05" />
                  <path d="M12.2 4.78c1.62 0 3.09.56 4.24 1.66l3.16-3.15C17.63 1.44 15.13.4 12.2.4 8.85.4 4.21 2.64 2.4 5.94l3.82 3.35c.84-2.54 3.2-4.51 5.98-4.51z" fill="#EA4335" />
                </svg>
              </span>
              <span className="text-center">{t("auth.continueWithGoogle")}</span>
            </Button>
          </div>

          {status === "loading" && (
            <p className="text-center text-xs font-medium text-white/72">{t("auth.loading")}</p>
          )}
        </div>
      </div>
    </div>
  )
}
