"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { hasDraftAccess, isEntitlementExpired, type DraftEntitlement } from "@/lib/zaza-id/types"

interface EntitlementGateProps {
  entitlement: DraftEntitlement | null
  loading: boolean
  error: string | null
  onRetry?: () => Promise<void> | void
  children: ReactNode
}

function DefaultFallback({ entitlement }: { entitlement: DraftEntitlement | null }) {
  const isExpired = entitlement ? isEntitlementExpired(entitlement.expiresAt) : false
  const message = isExpired
    ? "Your Draft access has expired. Please renew your licence or contact your administrator."
    : "Your Draft access is not active. Contact your administrator or upgrade your licence."

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl rounded-2xl border border-white/20 bg-black/20 p-6 text-white">
        <h2 className="text-xl font-semibold">Access required</h2>
        <p className="mt-2 text-sm text-white/90">{message}</p>
      </div>
    </div>
  )
}

export function EntitlementGate({
  entitlement,
  loading,
  error,
  onRetry,
  children,
}: EntitlementGateProps) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-900 dark:text-white">Checking licence…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-xl rounded-2xl border border-white/20 bg-black/20 p-6 text-white">
          <h2 className="text-xl font-semibold">Unable to verify access</h2>
          <p className="mt-2 text-sm text-white/90">{error}</p>
          {onRetry ? (
            <Button variant="outline" className="mt-4" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  if (!entitlement || !hasDraftAccess(entitlement)) {
    return <DefaultFallback entitlement={entitlement} />
  }

  return <>{children}</>
}
