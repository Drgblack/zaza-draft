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
  const { status, signInWithEmail, registerWithEmail, signInWithGoogle } = useAuth()
  const { t } = useLocale()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password)
        logClientEvent("auth_login_success", { provider: "email" })
      } else {
        await registerWithEmail(email, password)
        logClientEvent("auth_login_success", { provider: "email" })
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Something went wrong.")
      }
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

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
              {t("auth.marketingEyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {t("auth.title")}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
              {t("auth.description")}
            </p>
          </div>

          <InstantDraftTest onCreateAccount={() => setMode("signup")} />
        </div>

        <div className="space-y-6">
          <form className="space-y-4 rounded-2xl bg-white/10 p-6 shadow-lg backdrop-blur" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teacher@example.com"
                className="bg-white/80 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="bg-white/80 text-gray-900 pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                </button>
              </div>
              <p className="text-xs text-white/70">{t("auth.passwordHelper")}</p>
            </div>

            {error && <p className="text-sm text-rose-200">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? t("auth.processing")
                : mode === "signin"
                  ? t("auth.cta.signin")
                  : t("auth.cta.signup")}
            </Button>

            <p className="text-center text-xs text-white/70">
              {mode === "signin"
                ? t("auth.noAccount")
                : t("auth.alreadyHaveAccount")}
              <button type="button" onClick={toggleMode} className="ml-1 underline">
                {mode === "signin" ? t("auth.cta.signup") : t("auth.cta.signin")}
              </button>
            </p>
          </form>

          <div className="space-y-2">
            <p className="text-center text-sm text-white/80">{t("auth.orContinue")}</p>
            <Button
              variant="outline"
              className="w-full bg-white/90 text-gray-900 border-white/60 hover:bg-white hover:text-gray-900 flex items-center justify-center gap-2"
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
            <p className="text-center text-xs text-white/60">{t("auth.loading")}</p>
          )}
        </div>
      </div>
    </div>
  )
}
