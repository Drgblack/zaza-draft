"use client"

import { readAnalyticsConsent } from "@/lib/analytics-consent"

import type { ZazaSignal } from "./signal-schema"

const CLIENT_SIGNAL_ENDPOINT = "/api/analytics/signal"
const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "unknown"

function canUseBeacon() {
  return typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
}

function trySendBeacon(body: string) {
  if (!canUseBeacon()) {
    return false
  }

  return navigator.sendBeacon(
    CLIENT_SIGNAL_ENDPOINT,
    new Blob([body], { type: "application/json" }),
  )
}

export async function emitClientSignal(
  signal: Omit<ZazaSignal, "signalId" | "timestamp" | "appVersion">,
): Promise<void> {
  if (!readAnalyticsConsent()) {
    return
  }

  const payload = JSON.stringify({
    ...signal,
    appVersion: APP_VERSION,
  })

  try {
    if (typeof document !== "undefined" && document.visibilityState === "hidden" && trySendBeacon(payload)) {
      return
    }

    await fetch(CLIENT_SIGNAL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    })
  } catch (error) {
    if (trySendBeacon(payload)) {
      return
    }

    console.error("[analytics] client signal failed", error)
  }
}
