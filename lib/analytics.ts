import { readAnalyticsConsent } from "@/lib/analytics-consent"
import {
  buildDraftInteractionEventPayload,
  type DraftInteractionEventPayload,
} from "@/lib/draft-interaction-events"

type EventPayload = Record<string, unknown>

function canSendClientAnalytics() {
  if (typeof window === "undefined") {
    return false
  }

  return readAnalyticsConsent()
}

export function logClientEvent(name: string, payload: EventPayload = {}) {
  if (!canSendClientAnalytics()) {
    console.debug(`[analytics][client][suppressed] ${name}`, payload)
    return
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
}

export function logServerEvent(name: string, payload: EventPayload = {}) {
  console.info(`[analytics][server] ${name}`, payload)
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
