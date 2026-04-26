import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"

import { readAnalyticsConsent } from "@/lib/analytics-consent"
import { getFirebaseAdmin } from "@/lib/firebase/admin"

import type { ZazaSignal } from "./signal-schema"

const USAGE_SIGNALS_COLLECTION = "usage_signals"
const analyticsConsentStorage = new AsyncLocalStorage<boolean>()

export function withAnalyticsConsent<T>(enabled: boolean, callback: () => T): T {
  return analyticsConsentStorage.run(enabled, callback)
}

export function isAnalyticsEnabled(): boolean {
  const scopedConsent = analyticsConsentStorage.getStore()
  if (typeof scopedConsent === "boolean") {
    return scopedConsent
  }

  return readAnalyticsConsent()
}

export async function emitSignal(
  signal: Omit<ZazaSignal, "signalId" | "timestamp">,
): Promise<void> {
  if (!isAnalyticsEnabled()) {
    return
  }

  const enrichedSignal: ZazaSignal = {
    ...signal,
    signalId: randomUUID(),
    timestamp: Date.now(),
  }

  try {
    const { firestore } = getFirebaseAdmin()
    if (!firestore) {
      console.error("[analytics] usage signal skipped: firestore unavailable")
      return
    }

    await firestore
      .collection(USAGE_SIGNALS_COLLECTION)
      .doc(enrichedSignal.signalId)
      .set(enrichedSignal)
  } catch (error) {
    console.error("[analytics] usage signal write failed", error)
  }
}
