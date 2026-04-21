import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/firebase/server")
vi.mock("@/lib/rate-limit")
vi.mock("@/lib/panic-scan/ocr")
vi.mock("@/lib/panic-scan/clean-ocr")
vi.mock("@/lib/panic-scan/analysis")

import { POST } from "@/app/api/panic-scan/upload/route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"
import { enforcePerUserRateLimit } from "@/lib/rate-limit"
import { performVisionOcr } from "@/lib/panic-scan/ocr"
import { cleanOcrText } from "@/lib/panic-scan/clean-ocr"
import { analyzePanicMessage } from "@/lib/panic-scan/analysis"
import { OPENAI_BUSY_MESSAGE, OpenAIRequestError } from "@/lib/ai/openai-retry"

const storageSave = vi.fn().mockResolvedValue(undefined)
const firestoreSet = vi.fn().mockResolvedValue(undefined)
const mockDocRef = {
  id: "scan-id",
  set: firestoreSet,
}
const firestore = {
  collection: () => ({
    doc: () => mockDocRef,
  }),
}

describe("panic scan upload route", () => {
  function createFakeFile() {
    return {
      arrayBuffer: async () => Buffer.from("data"),
      name: "panic.png",
      type: "image/png",
      size: 4,
    }
  }

  function createFakeFormData({
    file = createFakeFile(),
    platform = "web",
    sessionId = "session-123",
    uiLocale = "en-GB",
  }: {
    file?: ReturnType<typeof createFakeFile> | string
    platform?: string
    sessionId?: string | null
    uiLocale?: string | null
  } = {}) {
    return {
      get: (key: string) => {
        if (key === "file") return file
        if (key === "platform") return platform
        if (key === "sessionId") return sessionId
        if (key === "uiLocale") return uiLocale
        return null
      },
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.OPENAI_API_KEY = "test-key"
    process.env.FIREBASE_STORAGE_BUCKET = "panic-bucket"
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "test-user",
      firestore,
      storage: {
        bucket: () => ({
          file: () => ({ save: storageSave }),
        }),
      },
    })
    vi.mocked(enforcePerUserRateLimit).mockResolvedValue(undefined)
    vi.mocked(performVisionOcr).mockResolvedValue(
      [
        "Sehr geehrte Eltern,",
        "Die Hausaufgabenmenge ist zuletzt gestiegen und die Schülerin arbeitet engagiert weiter.",
        "Wir möchten gemeinsam einen klaren Plan entwickeln und die Unterstützung transparent machen.",
      ].join("\n"),
    )
    vi.mocked(cleanOcrText).mockReturnValue({
      cleanText: "text",
      confidence: 1,
      removedLines: 0,
    })
    vi.mocked(analyzePanicMessage).mockImplementation(() => {
      throw new Error("analysis failed")
    })
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.FIREBASE_STORAGE_BUCKET
  })

  it("returns structured JSON when analysis fails", async () => {
    const request = {
      formData: async () => createFakeFormData(),
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.error.stage).toBe("analysis")
    expect(body.stage).toBe("analysis")
    expect(body.error.code).toBe("PROCESSING_FAILED")
    expect(body.diagnostics.aiConfigured).toBe(true)
    expect(body.requestId).toBeDefined()
    expect(response.headers.get("x-request-id")).toBe(body.requestId)
  })

  it("returns a clean busy message when OpenAI retries are exhausted", async () => {
    vi.mocked(analyzePanicMessage).mockRejectedValue(
      new OpenAIRequestError(OPENAI_BUSY_MESSAGE, {
        status: 429,
        requestId: "req_openai_busy",
        retryExhausted: true,
        userMessage: OPENAI_BUSY_MESSAGE,
      }),
    )

    const request = {
      formData: async () => createFakeFormData(),
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("PROCESSING_FAILED")
    expect(body.error.message).toBe(OPENAI_BUSY_MESSAGE)
    expect(firestoreSet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "failed",
        failureReason: OPENAI_BUSY_MESSAGE,
      }),
      { merge: true },
    )
  })

  it("rejects suspicious client paths instead of an uploaded file", async () => {
    const request = {
      formData: async () =>
        createFakeFormData({
          file: "C:\\Users\\User\\Downloads\\zaza-draft-app-123.json",
          uiLocale: null,
          sessionId: null,
        }),
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe("INVALID_FILE_PATH")
    expect(body.stage).toBe("parse")
    expect(authorizeFirebaseRequest).not.toHaveBeenCalled()
  })

  it("returns insufficient OCR when only UI chrome and a greeting are found", async () => {
    vi.mocked(performVisionOcr).mockResolvedValue(
      ["Gmail", "Inbox", "99+", "Sehr geehrte Eltern,", "Mit freundlichen Grüßen"].join("\n"),
    )
    const request = {
      formData: async () => createFakeFormData(),
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe("INSUFFICIENT_OCR")
    expect(body.error.stage).toBe("ocr")
    expect(response.headers.get("x-request-id")).toBe(body.requestId)
  })

  it("stores cleaned OCR, confidence, and classification on successful processing", async () => {
    vi.mocked(cleanOcrText).mockReturnValue({
      cleanText: "My child came home upset about the homework load.",
      confidence: 0.44,
      removedLines: 3,
    })
    vi.mocked(analyzePanicMessage).mockResolvedValue({
      classification: {
        messageType: "parent_complaint",
        emotionalTone: "angry",
        riskLevel: "medium",
        urgency: "medium",
        confidenceScore: 84,
      },
      analysis: {
        summary: "Parent is upset about workload.",
        emotionalInterpretation: "The parent sounds frustrated.",
        professionalRisk: "Escalation risk if ignored.",
        likelyMeaning: "They want a clear explanation and a calmer plan.",
        suggestedResponse: "acknowledge_concern",
      },
    })

    const request = {
      formData: async () => createFakeFormData({ platform: "mobile_ios" }),
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(analyzePanicMessage).toHaveBeenCalledWith(
      expect.stringContaining("Sehr geehrte Eltern"),
      "en",
      expect.any(Object),
    )
    expect(firestoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        extractedTextClean: "My child came home upset about the homework load.",
        cleanConfidence: 0.44,
        analysisLanguage: "en",
        analysisLanguageSource: "ui_locale",
        classification: expect.objectContaining({
          messageType: "parent_complaint",
          confidenceScore: 84,
        }),
        status: "completed",
      }),
      { merge: true },
    )
  })

  it("uses the active German UI locale for German analysis", async () => {
    vi.mocked(performVisionOcr).mockResolvedValue(
      [
        "Dear parents,",
        "I am very concerned about the homework situation this week.",
        "My son said he was overwhelmed after class, confused about the instructions, and worried about completing everything tonight.",
        "I would appreciate a clear explanation and some reassurance about what is expected next.",
      ].join("\n"),
    )
    vi.mocked(cleanOcrText).mockReturnValue({
      cleanText:
        "Dear parents,\nI am very concerned about the homework situation this week.\nMy son said he was overwhelmed after class, confused about the instructions, and worried about completing everything tonight.\nI would appreciate a clear explanation and some reassurance about what is expected next.",
      confidence: 0.66,
      removedLines: 1,
    })
    vi.mocked(analyzePanicMessage).mockResolvedValue({
      classification: {
        messageType: "parent_complaint",
        emotionalTone: "concerned",
        riskLevel: "low",
        urgency: "medium",
        confidenceScore: 72,
      },
      analysis: {
        summary: "Eltern sorgen sich wegen der Hausaufgaben.",
        emotionalInterpretation: "Die Nachricht klingt besorgt.",
        professionalRisk: "Geringes Eskalationsrisiko.",
        likelyMeaning: "Die Eltern wünschen sich Klarheit.",
        suggestedResponse: "offer_clarification",
      },
    })

    const request = {
      formData: async () =>
        createFakeFormData({
          uiLocale: "de-DE",
          sessionId: "session-de",
        }),
      headers: new Headers({
        Authorization: "Bearer token",
      }),
    } as unknown as Request

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(analyzePanicMessage).toHaveBeenCalledWith(
      expect.stringContaining("I am very concerned about the homework situation this week."),
      "de",
      expect.any(Object),
    )
    expect(firestoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisLanguage: "de",
        analysisLanguageSource: "ui_locale",
      }),
      { merge: true },
    )
  })

  it("keeps an English screenshot in German analysis when the active UI locale is German", async () => {
    vi.mocked(performVisionOcr).mockResolvedValue(
      [
        "My child came home upset after maths and said the class felt unfair.",
        "She told me the lesson moved too quickly, the worksheet was confusing, and she felt embarrassed asking for help in front of the group.",
        "I need to understand what happened and how this will be handled tomorrow.",
      ].join(" "),
    )
    vi.mocked(cleanOcrText).mockReturnValue({
      cleanText:
        "My child came home upset after maths and said the class felt unfair. She told me the lesson moved too quickly, the worksheet was confusing, and she felt embarrassed asking for help in front of the group. I need to understand what happened and how this will be handled tomorrow.",
      confidence: 0.61,
      removedLines: 0,
    })
    vi.mocked(analyzePanicMessage).mockResolvedValue({
      classification: {
        messageType: "parent_complaint",
        emotionalTone: "angry",
        riskLevel: "medium",
        urgency: "medium",
        confidenceScore: 79,
      },
      analysis: {
        summary: "Eltern melden eine Beschwerde.",
        emotionalInterpretation: "Die Nachricht klingt verärgert.",
        professionalRisk: "Mittleres Eskalationsrisiko.",
        likelyMeaning: "Die Eltern erwarten eine Rückmeldung.",
        suggestedResponse: "acknowledge_concern",
      },
    })

    const request = {
      formData: async () =>
        createFakeFormData({
          uiLocale: "de",
          sessionId: "session-en-text-de-ui",
        }),
      headers: new Headers({
        Authorization: "Bearer token",
        "Accept-Language": "en-GB,en;q=0.9",
      }),
    } as unknown as Request

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(analyzePanicMessage).toHaveBeenCalledWith(
      expect.stringContaining("My child came home upset after maths"),
      "de",
      expect.any(Object),
    )
    expect(firestoreSet).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisLanguage: "de",
        analysisLanguageSource: "ui_locale",
      }),
      { merge: true },
    )
  })

  it("does not reuse a previous locale across Panic Scan runs or sessions", async () => {
    vi.mocked(performVisionOcr)
      .mockResolvedValueOnce(
        [
          "My child was very upset after science today.",
          "He said the group work broke down, he felt blamed by the class, and he did not understand why the task changed so quickly.",
          "Please explain what happened and what support he will have tomorrow.",
        ].join(" "),
      )
      .mockResolvedValueOnce(
        [
          "Mein Kind war nach dem Unterricht heute sehr aufgebracht.",
          "Er sagte, dass die Gruppenarbeit chaotisch war, die Aufgabe plötzlich geändert wurde und er sich vor der Klasse bloßgestellt gefühlt hat.",
          "Bitte erklären Sie mir, was passiert ist und wie Sie morgen weiter vorgehen.",
        ].join(" "),
      )
    vi.mocked(cleanOcrText)
      .mockReturnValueOnce({
        cleanText:
          "My child was very upset after science today. He said the group work broke down, he felt blamed by the class, and he did not understand why the task changed so quickly. Please explain what happened and what support he will have tomorrow.",
        confidence: 0.72,
        removedLines: 0,
      })
      .mockReturnValueOnce({
        cleanText:
          "Mein Kind war nach dem Unterricht heute sehr aufgebracht. Er sagte, dass die Gruppenarbeit chaotisch war, die Aufgabe plötzlich geändert wurde und er sich vor der Klasse bloßgestellt gefühlt hat. Bitte erklären Sie mir, was passiert ist und wie Sie morgen weiter vorgehen.",
        confidence: 0.71,
        removedLines: 0,
      })
    vi.mocked(analyzePanicMessage).mockResolvedValue({
      classification: {
        messageType: "parent_complaint",
        emotionalTone: "angry",
        riskLevel: "medium",
        urgency: "medium",
        confidenceScore: 80,
      },
      analysis: {
        summary: "Stub summary",
        emotionalInterpretation: "Stub tone",
        professionalRisk: "Stub risk",
        likelyMeaning: "Stub meaning",
        suggestedResponse: "acknowledge_concern",
      },
    })

    const firstResponse = await POST(
      {
        formData: async () =>
          createFakeFormData({
            uiLocale: "en",
            sessionId: "session-en",
          }),
        headers: new Headers({
          Authorization: "Bearer token",
        }),
      } as unknown as Request,
    )
    const secondResponse = await POST(
      {
        formData: async () =>
          createFakeFormData({
            uiLocale: "de",
            sessionId: "session-de",
          }),
        headers: new Headers({
          Authorization: "Bearer token",
        }),
      } as unknown as Request,
    )

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(vi.mocked(analyzePanicMessage).mock.calls.map((call) => call[1])).toEqual(["en", "de"])
    expect(firestoreSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        extractedTextClean:
          "My child was very upset after science today. He said the group work broke down, he felt blamed by the class, and he did not understand why the task changed so quickly. Please explain what happened and what support he will have tomorrow.",
        analysisLanguage: "en",
        analysisLanguageSource: "ui_locale",
        status: "completed",
      }),
      { merge: true },
    )
    expect(firestoreSet).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        extractedTextClean:
          "Mein Kind war nach dem Unterricht heute sehr aufgebracht. Er sagte, dass die Gruppenarbeit chaotisch war, die Aufgabe plötzlich geändert wurde und er sich vor der Klasse bloßgestellt gefühlt hat. Bitte erklären Sie mir, was passiert ist und wie Sie morgen weiter vorgehen.",
        analysisLanguage: "de",
        analysisLanguageSource: "ui_locale",
        status: "completed",
      }),
      { merge: true },
    )
  })
})
