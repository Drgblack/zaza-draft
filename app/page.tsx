"use client"

import { MainEditor } from "@/components/main-editor"
import { AuthScreen } from "@/components/auth/auth-screen"
import { EntitlementGate } from "@/components/entitlements/EntitlementGate"
import { useDraftEntitlement } from "@/components/entitlements/useDraftEntitlement"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const { status } = useAuth()
  const entitlementState = useDraftEntitlement({ enabled: status === "authenticated" })

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-900 dark:text-white">Loading…</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <AuthScreen />
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
