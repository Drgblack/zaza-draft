"use client"

import { useCallback, useEffect, useState } from "react"

import { useAuth } from "@/hooks/use-auth"
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  migrateAnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/analytics-consent"

export function useAnalyticsConsent() {
  const { user } = useAuth()
  const [analyticsConsent, setAnalyticsConsentState] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    migrateAnalyticsConsent(user?.uid)
    setAnalyticsConsentState(readAnalyticsConsent(user?.uid))

    const syncConsent = () => {
      setAnalyticsConsentState(readAnalyticsConsent(user?.uid))
    }

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent)
    window.addEventListener("storage", syncConsent)

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent)
      window.removeEventListener("storage", syncConsent)
    }
  }, [user?.uid])

  const setAnalyticsConsent = useCallback(
    (enabled: boolean) => {
      setAnalyticsConsentState(enabled)
      writeAnalyticsConsent(enabled, user?.uid)
    },
    [user?.uid],
  )

  return {
    analyticsConsent,
    setAnalyticsConsent,
  }
}
