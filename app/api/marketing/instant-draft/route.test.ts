import { describe, it, expect, beforeEach, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/ai/provider", () => ({
  generateDraft: vi.fn(),
}))

vi.mock("@/src/lib/safetyEngine", () => ({
  runSafetyEngine: vi.fn(),
}))

import { POST } from "./route"
import { generateDraft } from "@/lib/ai/provider"
import { runSafetyEngine } from "@/src/lib/safetyEngine"

describe("marketing instant draft route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateDraft).mockResolvedValue({
      text: "Safer draft output",
      providerMeta: {
        modelUsed: "test-model",
        latencyMs: 12,
      },
    })
    vi.mocked(runSafetyEngine).mockResolvedValue({
      riskScore: 55,
      riskLevel: "medium",
      triggeredSignals: [],
      toneClass: "collaborative",
      topicSensitivity: "medium",
      reactionForecast: {
        collaborative: 30,
        concerned: 30,
        defensive: 20,
        hostile: 5,
        confused: 15,
      },
      explanationLines: [],
      documentationModeAvailable: false,
      professionalRiskFlags: [
        {
          signalId: "pro_medical_speculation",
          label: "Medical or diagnostic speculation",
          matchedPhrase: "ADHD",
        },
      ],
      structuralImbalance: false,
    })
  })

  it("rewrites anonymously once and sets a limiting cookie", async () => {
    const request = new NextRequest("https://example.com/api/marketing/instant-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message:
          "Dear Parent, your child keeps refusing instructions and this is becoming unacceptable. Kind regards, Ms Carter",
        language: "en",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data?.rewrittenText).toBe("Safer draft output")
    expect(json.data?.modeUsed).toBe("parent_message")
    expect(json.data?.limitReached).toBe(true)
    expect(response.headers.get("set-cookie")).toContain("zaza_instant_draft_used=1")
    expect(generateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        rewrite: true,
        previousDraft:
          "Dear Parent, your child keeps refusing instructions and this is becoming unacceptable. Kind regards, Ms Carter",
        mode: "parent_message",
        safetyAnalysis: expect.objectContaining({
          professionalRiskFlags: [],
        }),
      }),
    )
  })

  it("treats short note-style input as a report comment and skips parent-message safety analysis", async () => {
    const request = new NextRequest("https://example.com/api/marketing/instant-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message:
          "Clearer report comment on steady progress, better focus, and more consistent written accuracy this week.",
        language: "en",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data?.modeUsed).toBe("report_comment")
    expect(runSafetyEngine).not.toHaveBeenCalled()
    expect(generateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "report_comment",
        safetyAnalysis: null,
      }),
    )
  })

  it("blocks a second anonymous rewrite when the limiting cookie is present", async () => {
    const request = new NextRequest("https://example.com/api/marketing/instant-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "zaza_instant_draft_used=1",
      },
      body: JSON.stringify({
        message: "Please rewrite this parent email safely.",
        language: "en",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.success).toBe(false)
    expect(json.limitReached).toBe(true)
    expect(generateDraft).not.toHaveBeenCalled()
  })
})
