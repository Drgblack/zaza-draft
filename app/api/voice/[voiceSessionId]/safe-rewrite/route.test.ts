import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/firebase/server", () => ({
  authorizeFirebaseRequest: vi.fn(),
}))

vi.mock("@/lib/voice/emotion", () => ({
  analyzeVoiceEmotion: vi.fn(() => ({
    frustrationScore: 20,
    urgencyScore: 10,
    defensivenessScore: 5,
    primaryEmotion: "neutral",
    detectedNegativity: false,
  })),
}))

import { POST } from "./route"
import { authorizeFirebaseRequest } from "@/lib/firebase/server"

const docSet = vi.fn().mockResolvedValue(undefined)
const firestore = {
  collection: () => ({
    doc: () => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          userId: "test-user",
          status: "completed",
          transcribedText:
            "I am frustrated and need to turn these spoken notes into a calm update for the parent about homework and next steps.",
          language: "en",
          emotionAnalysis: {
            frustrationScore: 80,
            urgencyScore: 40,
            defensivenessScore: 25,
            primaryEmotion: "frustrated",
            detectedNegativity: true,
          },
        }),
      }),
      set: docSet,
    }),
  }),
}

describe("voice safe-rewrite route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeFirebaseRequest).mockResolvedValue({
      uid: "test-user",
      firestore,
    } as never)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              generatedDraft: "Calm parent-facing message",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    )
  })

  it("passes explicit voice transcript provenance into draft generation", async () => {
    const request = new Request("https://example.com/api/voice/voice-123/safe-rewrite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({ targetTone: "empathetic" }),
    })

    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      inputMode: "voice_to_calm",
      sourceType: "voice_transcript",
      voiceSessionId: "voice-123",
      tone: "empathetic",
    })
    const payload = await response.json()
    expect(payload.data?.safeVersion).toBe("Calm parent-facing message")
  })
})
