import { readAnalyticsConsent } from "@/lib/analytics-consent"
import {
  buildDraftInteractionEventPayload,
  type DraftInteractionEventPayload,
} from "@/lib/draft-interaction-events"

type EventPayload = Record<string, unknown>
type OnceStorageMode = "local" | "session"

const TRUST_FUNNEL_ONCE_STORAGE_PREFIX = "zaza:analytics:once"

export const TRUST_FUNNEL_EVENTS = {
  landingCtaHandoffCompleted: "landing_cta_handoff_completed",
  magicLinkRequested: "magic_link_requested",
  magicLinkRequestSucceeded: "magic_link_request_succeeded",
  magicLinkRequestFailed: "magic_link_request_failed",
  magicLinkCompleted: "magic_link_completed",
  accountBootstrapCompleted: "account_bootstrap_completed",
  onboardingBannerShown: "onboarding_banner_shown",
  onboardingCompleted: "onboarding_completed",
  onboardingDismissed: "onboarding_dismissed",
  firstDraftStarted: "first_draft_started",
  firstDraftGenerated: "first_draft_generated",
  draftCopied: "draft_copied",
  draftExported: "draft_exported",
  paywallShown: "paywall_shown",
  upgradeClicked: "upgrade_clicked",
  subscriptionStarted: "subscription_started",
} as const

export type TrustFunnelEventName =
  (typeof TRUST_FUNNEL_EVENTS)[keyof typeof TRUST_FUNNEL_EVENTS]

function canSendClientAnalytics() {
  if (typeof window === "undefined") {
    return false
  }

  return readAnalyticsConsent()
}

function getClientEventStorage(storage: OnceStorageMode) {
  if (typeof window === "undefined") {
    return null
  }

  return storage === "session" ? window.sessionStorage : window.localStorage
}

function buildTrustFunnelOnceKey(name: TrustFunnelEventName, scopeKey?: string | null) {
  return `${TRUST_FUNNEL_ONCE_STORAGE_PREFIX}:${name}:${scopeKey?.trim() || "global"}`
}

export function logClientEvent(name: string, payload: EventPayload = {}) {
  if (!canSendClientAnalytics()) {
    console.debug(`[analytics][client][suppressed] ${name}`, payload)
    return false
  }

  if (typeof window !== "undefined") {
    const analytics = (window as typeof window & { analytics?: { event: (name: string, payload: EventPayload) => void } }).analytics
    if (analytics?.event) {
      try {
        analytics.event(name, payload)
      } catch (error) {
        console.debug("[analytics] Client event error:", error)
      }
    }
  }

  console.debug(`[analytics][client] ${name}`, payload)
  return true
}

export function logServerEvent(name: string, payload: EventPayload = {}) {
  console.info(`[analytics][server] ${name}`, payload)
  return true
}

export function logClientEventOnce(
  name: TrustFunnelEventName,
  {
    payload = {},
    scopeKey,
    storage = "local",
  }: {
    payload?: EventPayload
    scopeKey?: string | null
    storage?: OnceStorageMode
  } = {},
) {
  if (!canSendClientAnalytics()) {
    return false
  }

  const eventStorage = getClientEventStorage(storage)
  if (!eventStorage) {
    return false
  }

  const eventKey = buildTrustFunnelOnceKey(name, scopeKey)
  if (eventStorage.getItem(eventKey) === "1") {
    return false
  }

  const didSend = logClientEvent(name, payload)
  if (didSend) {
    eventStorage.setItem(eventKey, "1")
  }

  return didSend
}

export async function logDraftInteractionEvent(
  getIdToken: (() => Promise<string | null>) | undefined,
  input: Partial<DraftInteractionEventPayload>,
) {
  if (!canSendClientAnalytics()) {
    console.debug("[analytics][draft_interaction_event][suppressed]", input)
    return false
  }

  const event = buildDraftInteractionEventPayload(input)
  if (!event) {
    console.debug("[analytics][draft_interaction_event][invalid]", input)
    return false
  }

  const token = await getIdToken?.()
  if (!token) {
    console.debug("[analytics][draft_interaction_event][missing-token]", event)
    return false
  }

  try {
    await fetch("/api/analytics/draft-interaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        consent: true,
        event,
      }),
    })
    return true
  } catch (error) {
    console.debug("[analytics][draft_interaction_event][error]", error)
    return false
  }
}
