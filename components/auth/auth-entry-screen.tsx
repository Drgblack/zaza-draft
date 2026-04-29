"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"

import { MainEditor } from "@/components/main-editor"
import { AuthScreen } from "@/components/auth/auth-screen"
import { PasswordResetScreen } from "@/components/auth/password-reset-screen"
import { EntitlementGate } from "@/components/entitlements/EntitlementGate"
import { useDraftEntitlement } from "@/components/entitlements/useDraftEntitlement"
import { useAuth } from "@/hooks/use-auth"
import { useLocale } from "@/hooks/use-locale"

export function AuthEntryScreen() {
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const { t } = useLocale()
  const entitlementState = useDraftEntitlement({ enabled: status === "authenticated" })

  const mode = searchParams.get("mode")
  const oobCode = searchParams.get("oobCode")
  const resetSuccess = searchParams.get("reset") === "success"
  const resetEmail = searchParams.get("email")?.trim() ?? ""

  const authBanner = useMemo(() => {
    if (resetSuccess) {
      return {
        title: t("auth.passwordReset.successTitle"),
        message: t("auth.passwordReset.signInPrompt"),
      }
    }

    if (mode === "verifyEmail") {
      return {
        title: t("auth.actionLink.noticeTitle"),
        message: t("auth.actionLink.verifyEmailNotice"),
      }
    }

    if (mode === "recoverEmail") {
      return {
        title: t("auth.actionLink.noticeTitle"),
        message: t("auth.actionLink.recoverEmailNotice"),
      }
    }

    return null
  }, [mode, resetSuccess, t])

  if (mode === "resetPassword") {
    return <PasswordResetScreen oobCode={oobCode} continueHref="/login" />
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-900 dark:text-white">{t("loading")}</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <AuthScreen
        initialMode={resetSuccess ? "password" : undefined}
        initialEmail={resetEmail || undefined}
        banner={authBanner ?? undefined}
      />
    )
  }

  return (
    <EntitlementGate
      entitlement={entitlementState.entitlement}
      loading={entitlementState.loading}
      error={entitlementState.error}
      onRetry={entitlementState.refresh}
    >
      <MainEditor canExport={entitlementState.hasAccess} />
    </EntitlementGate>
  )
}
