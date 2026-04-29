"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { classifyEmailLinkError } from "@/lib/auth/email-link"
import { logClientEvent, TRUST_FUNNEL_EVENTS } from "@/lib/analytics"
import { InstantDraftTest } from "@/components/marketing/instant-draft-test"
const GOOGLE_ERROR_MAP: Record<string, string> = {
  "auth/popup-closed-by-user": "You closed the Google window. Please try again.",
  "auth/cancelled-popup-request": "Only one Google window can be open at a time. Please refresh and try again.",
  "auth/popup-blocked": "Your browser blocked the popup. Allow popups for this site and retry.",
  "auth/unauthorized-domain":
    "This domain isn't authorized for Google sign-in. Contact the admin for help.",
}

interface AuthScreenBanner {
  title?: string
  message: string
}

interface AuthScreenProps {
  initialMode?: "email_link" | "password"
  initialEmail?: string
  banner?: AuthScreenBanner
}

export function AuthScreen({
  initialMode = "email_link",
  initialEmail,
  banner,
}: AuthScreenProps = {}) {
  const {
    status,
    emailLinkStatus,
    emailLinkKnownEmail,
    sendEmailLink,
    completeEmailLinkSignIn,
    signInWithPassword,
    sendPasswordReset,
    signInWithGoogle,
  } = useAuth()
  const { t } = useLocale()
  const [email, setEmail] = useState(initialEmail ?? "")
  const [password, setPassword] = useState("")
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [passwordResetEmail, setPasswordResetEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authMode, setAuthMode] = useState<"email_link" | "password">(initialMode)
  const isAwaitingEmail = emailLinkStatus === "awaiting_email"
  const isRecoveryState = emailLinkStatus === "recovery"
  const isProcessingEmailLink = emailLinkStatus === "processing"
  const isResend = Boolean(successEmail) || isRecoveryState
  const isPasswordMode = authMode === "password" && !isAwaitingEmail && !isRecoveryState

  useEffect(() => {
    if (!emailLinkKnownEmail) {
      return
    }

    setEmail((current) => current || emailLinkKnownEmail)
  }, [emailLinkKnownEmail])

  useEffect(() => {
    if (!initialEmail) {
      return
    }

    setEmail((current) => current || initialEmail)
  }, [initialEmail])

  useEffect(() => {
    if (isAwaitingEmail || isRecoveryState) {
      return
    }

    setAuthMode(initialMode)
  }, [initialMode, isAwaitingEmail, isRecoveryState])

  useEffect(() => {
    if (isAwaitingEmail || isRecoveryState) {
      setAuthMode("email_link")
    }
  }, [isAwaitingEmail, isRecoveryState])

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
      flow: isPasswordMode
        ? "password_sign_in"
        : isAwaitingEmail
        ? "complete_email_link"
        : isRecoveryState
        ? "recover_email_link"
        : "send_email_link",
      email: email.trim(),
    })

    try {
      const normalizedEmail = email.trim()
      setPasswordResetEmail(null)
      if (isPasswordMode) {
        await signInWithPassword(normalizedEmail, password)
        logClientEvent("auth_login_success", { provider: "password" })
      } else if (isAwaitingEmail) {
        await completeEmailLinkSignIn(normalizedEmail)
        logClientEvent("auth_login_success", { provider: "email_link" })
      } else {
        logClientEvent(TRUST_FUNNEL_EVENTS.magicLinkRequested, {
          surface: "auth_screen",
          resend: isResend,
        })
        await sendEmailLink(normalizedEmail)
        logClientEvent(TRUST_FUNNEL_EVENTS.magicLinkRequestSucceeded, {
          surface: "auth_screen",
          resend: isResend,
        })
        setSuccessEmail(normalizedEmail)
      }
    } catch (err) {
      console.error("[auth] auth screen submit error", err)
      setSuccessEmail(null)
      if (isPasswordMode) {
        if ((err as { code?: string })?.code === "auth/invalid-email") {
          setError(t("auth.error.invalidEmail"))
        } else {
          setError(t("auth.error.passwordSignInFailed"))
        }
      } else {
        logClientEvent(TRUST_FUNNEL_EVENTS.magicLinkRequestFailed, {
          surface: "auth_screen",
          resend: isResend,
          code: (err as { code?: string })?.code ?? "unknown",
        })
        if (classifyEmailLinkError(err) === "expired_or_used") {
          setError(null)
        } else {
          setError(getFriendlyEmailLinkError(err))
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccessEmail(null)
    setPasswordResetEmail(null)

    try {
      const normalizedEmail = email.trim()
      await sendPasswordReset(normalizedEmail)
      setPasswordResetEmail(normalizedEmail)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === "auth/invalid-email" || (err instanceof Error && err.message.includes("Email is required"))) {
        setError(t("auth.error.invalidEmail"))
      } else {
        setError(t("auth.error.passwordResetFailed"))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLandingCtaHandoff = () => {
    logClientEvent(TRUST_FUNNEL_EVENTS.landingCtaHandoffCompleted, {
      source: "instant_draft_test",
    })
    document.getElementById("email")?.focus()
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

  const formTitle = isRecoveryState
    ? t("auth.emailLink.recoveryTitle")
    : isAwaitingEmail
    ? t("auth.emailLink.confirmTitle")
    : t("auth.title.signin")
  const formDescription = isRecoveryState
    ? t(
        emailLinkKnownEmail
          ? "auth.emailLink.recoveryDescriptionKnown"
          : "auth.emailLink.recoveryDescriptionUnknown",
      )
    : isAwaitingEmail
    ? t("auth.emailLink.confirmDescription")
    : isPasswordMode
    ? t("auth.password.helper")
    : t("auth.emailLink.helper")
  const inputHelper = isRecoveryState
    ? t(
        emailLinkKnownEmail
          ? "auth.emailLink.recoveryHelperKnown"
          : "auth.emailLink.recoveryHelperUnknown",
      )
    : isAwaitingEmail
    ? t("auth.emailLink.confirmHelper")
    : isPasswordMode
    ? t("auth.password.inputHelper")
    : t("auth.emailLink.inputHelper")
  const submitLabel = isProcessingEmailLink
    ? t("auth.emailLink.processing")
    : isSubmitting
    ? isPasswordMode
      ? t("auth.password.processing")
      : isAwaitingEmail
      ? t("auth.processing.completeLink")
      : t("auth.processing.sendLink")
    : isPasswordMode
    ? t("auth.password.cta")
    : isAwaitingEmail
    ? t("auth.cta.completeEmailLink")
    : isRecoveryState
    ? t("auth.cta.sendNewLink")
    : successEmail
    ? t("auth.cta.resendLink")
    : t("auth.cta.sendLink")

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#5b36a6] via-[#3b63b8] to-[#264f96] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.16),rgba(15,23,42,0.44))]" />
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

          <InstantDraftTest onCreateAccount={handleLandingCtaHandoff} />
        </div>

        <div className="space-y-5 lg:justify-self-end lg:w-full lg:max-w-md">
          <form
            className="space-y-5 rounded-[28px] border border-white/18 bg-[linear-gradient(180deg,rgba(53,86,154,0.88),rgba(37,62,124,0.94))] p-6 shadow-[0_32px_72px_rgba(15,23,42,0.34)] backdrop-blur-[28px] sm:p-7"
            onSubmit={handleSubmit}
          >
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                {formTitle}
              </p>
              <p className="text-sm leading-6 text-white/92">{formDescription}</p>
            </div>

            {banner && (
              <div className="rounded-2xl border border-white/18 bg-white/10 p-3 text-sm text-white/92">
                {banner.title && <p className="font-semibold text-white">{banner.title}</p>}
                <p className={banner.title ? "mt-1" : undefined}>{banner.message}</p>
              </div>
            )}

            {!isAwaitingEmail && !isRecoveryState && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/12 bg-white/6 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("email_link")
                    setError(null)
                    setPasswordResetEmail(null)
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    !isPasswordMode
                      ? "bg-white text-slate-950"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {t("auth.mode.emailLink")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("password")
                    setError(null)
                    setSuccessEmail(null)
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isPasswordMode
                      ? "bg-white text-slate-950"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {t("auth.mode.password")}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-white">
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
              <p className="text-[13px] leading-5 text-white/86">{inputHelper}</p>
            </div>

            {isPasswordMode && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-white">
                  {t("auth.passwordLabel")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) {
                      setError(null)
                    }
                  }}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border-white/30 bg-white/95 px-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] placeholder:text-slate-400 focus-visible:border-white/50 focus-visible:ring-white/25"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isSubmitting}
                    className="text-sm font-semibold text-white/88 underline underline-offset-4 hover:text-white"
                  >
                    {t("auth.cta.forgot")}
                  </button>
                </div>
              </div>
            )}

            {successEmail && !isAwaitingEmail && !error && (
              <div className="rounded-xl border border-emerald-200/28 bg-[linear-gradient(180deg,rgba(20,83,45,0.34),rgba(14,116,144,0.28))] px-3 py-3 text-sm text-emerald-50">
                <p className="font-semibold">{t("auth.emailLink.successTitle")}</p>
                <p className="mt-1">{t("auth.emailLink.sent", { email: successEmail })}</p>
                <p className="mt-1 text-emerald-50/90">{t("auth.emailLink.sentHint")}</p>
              </div>
            )}

            {isRecoveryState && !successEmail && (
              <div className="rounded-xl border border-amber-200/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-50">
                <p className="font-semibold">{t("auth.emailLink.recoveryTitle")}</p>
                <p className="mt-1">{t("auth.emailLink.recoveryNotice")}</p>
              </div>
            )}

            {passwordResetEmail && !error && (
              <div className="rounded-xl border border-emerald-200/28 bg-[linear-gradient(180deg,rgba(20,83,45,0.34),rgba(14,116,144,0.28))] px-3 py-3 text-sm text-emerald-50">
                <p className="font-semibold">{t("auth.password.resetTitle")}</p>
                <p className="mt-1">{t("auth.password.resetSent", { email: passwordResetEmail })}</p>
                <p className="mt-1 text-emerald-50/90">{t("auth.password.resetHint")}</p>
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
              {submitLabel}
            </Button>
          </form>

          <div className="space-y-3 rounded-2xl border border-white/16 bg-[linear-gradient(180deg,rgba(47,74,139,0.82),rgba(36,58,115,0.88))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.2)] backdrop-blur-[22px]">
            <p className="text-center text-sm font-medium text-white/92">{t("auth.orContinue")}</p>
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
