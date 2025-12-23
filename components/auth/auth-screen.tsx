"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"
import { logClientEvent } from "@/lib/analytics"

const SUPPORT_EMAIL = "greg@zazatechnologies.com"

export function AuthScreen() {
  const { status, signInWithEmail, registerWithEmail, signInWithGoogle } = useAuth()
  const { t } = useLocale()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
      if (err instanceof Error) {
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
      <div className="w-full max-w-lg space-y-8">
        <div>
          <h1 className="text-4xl font-bold">{t("auth.title")}</h1>
          <p className="mt-2 text-sm text-white/80">
            {t("auth.description")}{" "}
            <Link
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline hover:text-white"
              aria-label="Support email"
            >
              {SUPPORT_EMAIL}
            </Link>
          </p>
        </div>

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
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="bg-white/80 text-gray-900"
            />
            <p className="text-xs text-white/70">{t("auth.passwordHelper")}</p>
          </div>

          {error && <p className="text-sm text-rose-200">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t("auth.processing")
              : mode === "signin"
                ? t("auth.signIn")
                : t("auth.createAccount")}
          </Button>

          <p className="text-center text-xs text-white/70">
            {mode === "signin"
              ? t("auth.noAccount")
              : t("auth.alreadyHaveAccount")}
            <button type="button" onClick={toggleMode} className="ml-1 underline">
              {mode === "signin" ? t("auth.createAccount") : t("auth.signIn")}
            </button>
          </p>
        </form>

        <div className="space-y-2">
          <p className="text-center text-sm text-white/80">{t("auth.orContinue")}</p>
          <Button variant="outline" className="w-full text-white border-white/60 hover:border-white" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            {t("auth.continueWithGoogle")}
          </Button>
        </div>

        {status === "loading" && (
          <p className="text-center text-xs text-white/60">{t("auth.loading")}</p>
        )}
      </div>
    </div>
  )
}
