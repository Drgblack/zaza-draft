type EventPayload = Record<string, unknown>

export function logClientEvent(name: string, payload: EventPayload = {}) {
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
