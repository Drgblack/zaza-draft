import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { writeAnalyticsConsent } from "@/lib/analytics-consent"
import { logClientEvent, logDraftInteractionEvent } from "@/lib/analytics"

describe("analytics consent gating", () => {
  const analyticsEvent = vi.fn()
  const fetchMock = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal("fetch", fetchMock)
    ;(window as typeof window & {
      analytics?: { event: (name: string, payload: Record<string, unknown>) => void }
    }).analytics = {
      event: analyticsEvent,
    }
    analyticsEvent.mockReset()
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    delete (window as typeof window & { analytics?: unknown }).analytics
  })

  it("suppresses client analytics when consent is disabled", () => {
    logClientEvent("draft_generate_requested", { tone: "warm" })
    expect(analyticsEvent).not.toHaveBeenCalled()
  })

  it("sends client analytics when consent is enabled", () => {
    writeAnalyticsConsent(true)

    logClientEvent("draft_generate_requested", { tone: "warm" })
    expect(analyticsEvent).toHaveBeenCalledWith("draft_generate_requested", { tone: "warm" })
  })

  it("posts only sanitized draft interaction metadata when consent is enabled", async () => {
    writeAnalyticsConsent(true)
    fetchMock.mockResolvedValue({ ok: true })

    await logDraftInteractionEvent(
      async () => "token-123",
      {
        event_name: "draft_created",
        message_context: "parent_email",
        workflow_type: "new_message",
        time_context: "school_hours",
        edit_depth: 1,
        teacher_intent: "clarify_expectations",
        timestamp: "2026-03-16T12:00:00.000Z",
        message_text: "do not send this",
      } as Record<string, unknown>,
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, requestInit] = fetchMock.mock.calls[0]
    expect(requestInit.headers.Authorization).toBe("Bearer token-123")
    expect(requestInit.body).toContain('"event_name":"draft_created"')
    expect(requestInit.body).toContain('"teacher_intent":"clarify_expectations"')
    expect(requestInit.body).not.toContain("message_text")
    expect(requestInit.body).not.toContain("do not send this")
  })
})
