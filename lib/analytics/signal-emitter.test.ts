import { beforeEach, describe, expect, it, vi } from "vitest"

const { setMock, docMock, collectionMock, getFirebaseAdminMock } = vi.hoisted(() => {
  const localSetMock = vi.fn()
  const localDocMock = vi.fn(() => ({ set: localSetMock }))
  const localCollectionMock = vi.fn(() => ({ doc: localDocMock }))
  const localGetFirebaseAdminMock = vi.fn(() => ({
    auth: null,
    firestore: {
      collection: localCollectionMock,
    },
    storage: null,
  }))

  return {
    setMock: localSetMock,
    docMock: localDocMock,
    collectionMock: localCollectionMock,
    getFirebaseAdminMock: localGetFirebaseAdminMock,
  }
})

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdmin: getFirebaseAdminMock,
}))

describe("signal emitter", () => {
  beforeEach(() => {
    setMock.mockReset()
    docMock.mockClear()
    collectionMock.mockClear()
    getFirebaseAdminMock.mockClear()
    setMock.mockResolvedValue(undefined)
  })

  it("does not emit when consent is off", async () => {
    const { emitSignal, withAnalyticsConsent } = await import("@/lib/analytics/signal-emitter")

    await withAnalyticsConsent(false, () =>
      emitSignal({
        sessionId: "req-1",
        uidHash: "abc123",
        signalType: "draft_generated",
        payload: {
          modelUsed: "test-model",
          generationAttempts: 1,
          sourceWordCount: 20,
          outputWordCount: 30,
          inputIntent: "teacher_to_parent",
          languagePair: "en-en",
          latencyMs: 120,
        },
        appVersion: "0.1.0",
        locale: "en",
      }),
    )

    expect(collectionMock).not.toHaveBeenCalled()
    expect(setMock).not.toHaveBeenCalled()
  })

  it("emits a signal when consent is on", async () => {
    const { emitSignal, withAnalyticsConsent } = await import("@/lib/analytics/signal-emitter")

    await withAnalyticsConsent(true, () =>
      emitSignal({
        sessionId: "req-2",
        uidHash: "def456",
        signalType: "draft_generated",
        payload: {
          modelUsed: "test-model",
          generationAttempts: 2,
          sourceWordCount: 40,
          outputWordCount: 55,
          inputIntent: "teacher_to_parent",
          languagePair: "en-en",
          latencyMs: 220,
        },
        appVersion: "0.1.0",
        locale: "en",
      }),
    )

    expect(collectionMock).toHaveBeenCalledWith("usage_signals")
    expect(docMock).toHaveBeenCalledTimes(1)
    expect(setMock).toHaveBeenCalledTimes(1)

    const emittedSignal = setMock.mock.calls[0][0]
    expect(emittedSignal).toMatchObject({
      sessionId: "req-2",
      uidHash: "def456",
      signalType: "draft_generated",
      appVersion: "0.1.0",
      locale: "en",
    })
    expect(typeof emittedSignal.signalId).toBe("string")
    expect(typeof emittedSignal.timestamp).toBe("number")
  })

  it("never throws when Firestore write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { emitSignal, withAnalyticsConsent } = await import("@/lib/analytics/signal-emitter")
    setMock.mockRejectedValueOnce(new Error("firestore down"))

    await expect(
      withAnalyticsConsent(true, () =>
        emitSignal({
          sessionId: "req-3",
          uidHash: "ghi789",
          signalType: "draft_generated",
          payload: {
            modelUsed: "test-model",
            generationAttempts: 1,
            sourceWordCount: 10,
            outputWordCount: 12,
            inputIntent: "teacher_to_parent",
            languagePair: "en-en",
            latencyMs: 80,
          },
          appVersion: "0.1.0",
          locale: "en",
        }),
      ),
    ).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it("writes payloads without message content fields", async () => {
    const { emitSignal, withAnalyticsConsent } = await import("@/lib/analytics/signal-emitter")

    await withAnalyticsConsent(true, () =>
      emitSignal({
        sessionId: "req-4",
        uidHash: "jkl012",
        signalType: "draft_edited_minor",
        payload: {
          interactionType: "edited_minor",
          timeToActionMs: 1800,
          sendConfidenceScore: 74,
          verdictAtAction: "improved",
          editDistanceCategory: "minor",
        },
        appVersion: "0.1.0",
        locale: "en",
      }),
    )

    const payload = setMock.mock.calls[0][0].payload as Record<string, unknown>
    const stringValues = Object.values(payload).filter(
      (value): value is string => typeof value === "string",
    )

    expect(stringValues.every((value) => value.length <= 50)).toBe(true)
  })

  it("generates a unique signal id for each emission", async () => {
    const { emitSignal, withAnalyticsConsent } = await import("@/lib/analytics/signal-emitter")

    await withAnalyticsConsent(true, () =>
      emitSignal({
        sessionId: "req-5",
        uidHash: "mno345",
        signalType: "teacher_draft_mode_used",
        payload: {
          feature: "teacher_draft_mode",
          context: "limit",
        },
        appVersion: "0.1.0",
        locale: "en",
      }),
    )

    await withAnalyticsConsent(true, () =>
      emitSignal({
        sessionId: "req-6",
        uidHash: "pqr678",
        signalType: "teacher_draft_mode_used",
        payload: {
          feature: "teacher_draft_mode",
          context: "inform",
        },
        appVersion: "0.1.0",
        locale: "en",
      }),
    )

    expect(setMock.mock.calls[0][0].signalId).not.toBe(setMock.mock.calls[1][0].signalId)
  })
})
