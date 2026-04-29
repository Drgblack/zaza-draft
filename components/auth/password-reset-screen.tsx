"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/hooks/use-locale"
import { auth } from "@/lib/firebase/client"

type PasswordResetStatus = "checking" | "ready" | "expired" | "submitting" | "success"

interface PasswordResetScreenProps {
  oobCode: string | null
  continueHref?: string
}

export function PasswordResetScreen({
  oobCode,
  continueHref = "/login",
}: PasswordResetScreenProps) {
  const { t } = useLocale()
  const [status, setStatus] = useState<PasswordResetStatus>("checking")
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function verifyCode() {
      if (!auth || !oobCode) {
        if (!cancelled) {
          setStatus("expired")
        }
        return
      }

      try {
        const resolvedEmail = await verifyPasswordResetCode(auth, oobCode)
        if (cancelled) {
          return
        }
        setEmail(resolvedEmail)
        setStatus("ready")
      } catch {
        if (!cancelled) {
          setStatus("expired")
        }
      }
    }

    void verifyCode()

    return () => {
      cancelled = true
    }
  }, [oobCode])

  const passwordMismatch =
    password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword

  const passwordTooShort = password.length > 0 && password.length < 8

  const disableSubmit =
    status !== "ready" ||
    password.length < 8 ||
    confirmPassword.length < 8 ||
    passwordMismatch ||
    passwordTooShort
  const isChecking = status === "checking"
  const isSubmitting = status === "submitting"
  const showTerminalState = status === "expired" || status === "success"

  const helperCopy = useMemo(() => {
    if (status === "expired") {
      return t("auth.passwordReset.expired")
    }
    if (status === "success") {
      return t("auth.passwordReset.success")
    }
    if (status === "checking") {
      return t("auth.passwordReset.checking")
    }
    return t("auth.passwordReset.helper")
  }, [status, t])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!auth || !oobCode || disableSubmit) {
      return
    }

    setStatus("submitting")
    setError(null)

    try {
      await confirmPasswordReset(auth, oobCode, password)
      setStatus("success")
      setPassword("")
      setConfirmPassword("")
    } catch (resetError) {
      const code = (resetError as { code?: string })?.code
      if (
        code === "auth/expired-action-code" ||
        code === "auth/invalid-action-code" ||
        code === "auth/user-disabled"
      ) {
        setStatus("expired")
        setError(t("auth.passwordReset.expired"))
        return
      }

      if (code === "auth/weak-password") {
        setStatus("ready")
        setError(t("auth.passwordReset.weakPassword"))
        return
      }

      setStatus("ready")
      setError(t("auth.passwordReset.failure"))
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#5b36a6] via-[#3b63b8] to-[#264f96] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.16),rgba(15,23,42,0.44))]" />

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/18 bg-[linear-gradient(180deg,rgba(53,86,154,0.88),rgba(37,62,124,0.94))] p-6 shadow-[0_32px_72px_rgba(15,23,42,0.34)] backdrop-blur-[28px] sm:p-7">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            {t("auth.passwordReset.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold text-white">
            {t("auth.passwordReset.title")}
          </h1>
          <p className="text-sm leading-6 text-white/92">{helperCopy}</p>
          {email && status !== "expired" && (
            <p className="text-xs text-white/72">
              {t("auth.passwordReset.emailHint", { email })}
            </p>
          )}
        </div>

        {showTerminalState ? (
          <div className="mt-6 space-y-4">
            {error && (
              <div className="rounded-2xl border border-amber-200/40 bg-white/10 p-3 text-sm text-white/92">
                {error}
              </div>
            )}
            {status === "success" && (
              <div className="rounded-2xl border border-emerald-200/40 bg-emerald-400/12 p-3 text-sm text-emerald-50">
                {t("auth.passwordReset.success")}
              </div>
            )}
            <Link href={continueHref} className="block">
              <Button className="w-full rounded-xl bg-white text-slate-950 hover:bg-white/90">
                {t("auth.passwordReset.backToSignIn")}
              </Button>
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-semibold text-white">
                {t("auth.passwordReset.newPassword")}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                autoComplete="new-password"
                disabled={isChecking || isSubmitting}
                className="h-11 rounded-xl border-white/30 bg-white/95 px-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] placeholder:text-slate-400 focus-visible:border-white/50 focus-visible:ring-white/25"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold text-white">
                {t("auth.passwordReset.confirmPassword")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("auth.passwordReset.confirmPassword")}
                autoComplete="new-password"
                disabled={isChecking || isSubmitting}
                className="h-11 rounded-xl border-white/30 bg-white/95 px-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] placeholder:text-slate-400 focus-visible:border-white/50 focus-visible:ring-white/25"
              />
            </div>

            {passwordTooShort && (
              <p className="text-sm text-amber-100">{t("auth.passwordReset.minLength")}</p>
            )}
            {passwordMismatch && (
              <p className="text-sm text-amber-100">{t("auth.passwordReset.mismatch")}</p>
            )}
            {error && <p className="text-sm text-amber-100">{error}</p>}

            <Button
              type="submit"
              disabled={disableSubmit || isSubmitting}
              className="w-full rounded-xl bg-white text-slate-950 hover:bg-white/90"
            >
              {isSubmitting
                ? t("auth.passwordReset.submitting")
                : t("auth.passwordReset.submit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
