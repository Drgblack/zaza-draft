// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
const sendBeaconMock = vi.fn()
const readAnalyticsConsentMock = vi.fn()

vi.mock("@/lib/analytics-consent", () => ({
  readAnalyticsConsent: readAnalyticsConsentMock,
}))

describe("emitClientSignal", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    sendBeaconMock.mockReset()
    readAnalyticsConsentMock.mockReset()
    readAnalyticsConsentMock.mockReturnValue(true)
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("navigator", {
      sendBeacon: sendBeaconMock,
    })
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    })
  })

  it("does nothing when consent is off", async () => {
    readAnalyticsConsentMock.mockReturnValue(false)
    const { emitClientSignal } = await import("@/lib/analytics/client-signal-emitter")

    await emitClientSignal({
      sessionId: "req-1",
      uidHash: "hash-1",
      signalType: "draft_accepted",
      payload: {
        interactionType: "accepted",
        timeToActionMs: 1200,
        editDistanceCategory: "none",
      },
      locale: "en",
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(sendBeaconMock).not.toHaveBeenCalled()
  })

  it("posts the signal when consent is on", async () => {
    fetchMock.mockResolvedValue({ ok: true })
    const { emitClientSignal } = await import("@/lib/analytics/client-signal-emitter")

    await emitClientSignal({
      sessionId: "req-2",
      uidHash: "hash-2",
      signalType: "draft_regenerated",
      payload: {
        interactionType: "regenerated",
        timeToActionMs: 500,
      },
      locale: "en",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/analytics/signal")
    expect(init.method).toBe("POST")
    expect(init.keepalive).toBe(true)
  })

  it("uses sendBeacon when the page is hidden", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    })
    sendBeaconMock.mockReturnValue(true)
    const { emitClientSignal } = await import("@/lib/analytics/client-signal-emitter")

    await emitClientSignal({
      sessionId: "req-3",
      uidHash: "hash-3",
      signalType: "risk_strip_viewed",
      payload: {
        interactionType: "viewed",
        sendConfidenceScore: 82,
        replyLikelihood: "low",
        regretRisk: "low",
        viewDurationMs: 2400,
      },
      locale: "en",
    })

    expect(sendBeaconMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
