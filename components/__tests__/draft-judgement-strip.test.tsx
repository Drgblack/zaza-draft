// @vitest-environment happy-dom

import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DraftJudgementStrip,
  type DraftProfessionalJudgementMeta,
} from "@/components/draft-judgement-strip"

const messages: Record<string, string> = {
  "judgementStrip.sendConfidence": "Send confidence",
  "judgementStrip.replyLikelihood": "Reply likelihood",
  "judgementStrip.regretRisk": "Regret risk",
  "judgementStrip.low": "Low",
  "judgementStrip.medium": "Medium",
  "judgementStrip.high": "High",
}

const { emitClientSignalMock } = vi.hoisted(() => ({
  emitClientSignalMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/hooks/use-locale", () => ({
  useLocale: () => ({
    locale: "en-GB",
    t: (key: string) => messages[key] ?? key,
  }),
}))

vi.mock("@/lib/analytics/client-signal-emitter", () => ({
  emitClientSignal: emitClientSignalMock,
}))

let currentObserver: {
  callback: IntersectionObserverCallback
} | null = null

beforeEach(() => {
  vi.useFakeTimers()
  emitClientSignalMock.mockClear()
  currentObserver = null
  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      currentObserver = { callback }
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as unknown as typeof IntersectionObserver)
})

const buildJudgement = (
  overrides: Partial<DraftProfessionalJudgementMeta> = {},
): DraftProfessionalJudgementMeta => ({
  sendConfidenceScore: 84,
  replyLikelihood: "low",
  regretRisk: "low",
  parentInterpretationRisk: "low",
  signals: [],
  ...overrides,
})

describe("DraftJudgementStrip", () => {
  it("renders a green shield for high confidence", () => {
    render(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement({ sendConfidenceScore: 85 })}
        teacherDraftMode
        modeUsed="parent_message"
      />,
    )

    const confidence = screen.getByTestId("judgement-send-confidence")
    expect(confidence).toHaveTextContent("85%")
    expect(confidence.querySelector("svg")).toHaveClass("text-green-600")
  })

  it("renders red styling for low confidence", () => {
    render(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement({ sendConfidenceScore: 45 })}
        teacherDraftMode
        modeUsed="parent_message"
      />,
    )

    expect(screen.getByTestId("judgement-send-confidence").querySelector("svg")).toHaveClass(
      "text-red-600",
    )
  })

  it("returns null when verdict is already_strong", () => {
    const { container } = render(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement()}
        teacherDraftMode
        modeUsed="parent_message"
        verdict="already_strong"
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it("returns null when teacherDraftMode is false", () => {
    const { container } = render(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement()}
        teacherDraftMode={false}
        modeUsed="parent_message"
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it("renders amber styling for medium reply likelihood", () => {
    render(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement({ replyLikelihood: "medium" })}
        teacherDraftMode
        modeUsed="parent_message"
      />,
    )

    const replyLikelihood = screen.getByTestId("judgement-reply-likelihood")
    expect(replyLikelihood).toHaveTextContent("Medium")
    expect(replyLikelihood.querySelector("svg")).toHaveClass("text-amber-500")
  })

  it("emits caused_pause after a long visible pause before send", () => {
    const nowSpy = vi.spyOn(Date, "now")
    nowSpy.mockReturnValue(1_000)

    const { rerender } = render(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement()}
        teacherDraftMode
        modeUsed="parent_message"
        analyticsContext={{
          sessionId: "req-1",
          uidHash: "hash-1",
          locale: "en",
        }}
      />,
    )

    act(() => {
      currentObserver?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    nowSpy.mockReturnValue(7_100)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    rerender(
      <DraftJudgementStrip
        professionalJudgement={buildJudgement()}
        teacherDraftMode
        modeUsed="parent_message"
        analyticsContext={{
          sessionId: "req-1",
          uidHash: "hash-1",
          locale: "en",
        }}
        lastAction={{
          type: "sent",
          at: 7_100,
        }}
      />,
    )

    expect(emitClientSignalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signalType: "risk_strip_caused_pause",
        payload: expect.objectContaining({
          interactionType: "caused_pause",
          viewDurationMs: expect.any(Number),
        }),
      }),
    )
    const payload = emitClientSignalMock.mock.calls.find(
      ([signal]) => signal.signalType === "risk_strip_caused_pause",
    )?.[0]?.payload as { viewDurationMs: number }
    expect(payload.viewDurationMs).toBeGreaterThanOrEqual(6000)
  })
})
