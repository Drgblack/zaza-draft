"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { hasDraftAccess, parseDraftEntitlement, type DraftEntitlement } from "@/lib/zaza-id/types"

interface UseDraftEntitlementOptions {
  enabled?: boolean
}

interface DraftEntitlementState {
  entitlement: DraftEntitlement | null
  loading: boolean
  error: string | null
  hasAccess: boolean
  refresh: () => Promise<void>
}

export function useDraftEntitlement(options: UseDraftEntitlementOptions = {}): DraftEntitlementState {
  const { enabled = true } = options
  const { status, getIdToken } = useAuth()
  const [entitlement, setEntitlement] = useState<DraftEntitlement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || status !== "authenticated") {
      setEntitlement(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error("Missing authentication token.")
      }

      const response = await fetch("/api/entitlements", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          payload?.error?.message || payload?.message || "Unable to load your entitlement."
        throw new Error(message)
      }

      const parsedEntitlement = parseDraftEntitlement(payload?.data)
      setEntitlement(parsedEntitlement)
    } catch (loadError) {
      setEntitlement(null)
      setError((loadError as Error).message || "Unable to load your entitlement.")
    } finally {
      setLoading(false)
    }
  }, [enabled, getIdToken, status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasAccess = useMemo(() => (entitlement ? hasDraftAccess(entitlement) : false), [entitlement])

  return {
    entitlement,
    loading,
    error,
    hasAccess,
    refresh,
  }
}
