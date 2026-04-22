import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { classifyTone } from "@/src/lib/safetyEngine/toneClassifier"

function mockAnthropicResponse(text: string) {
  vi.mocked(global.fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        content: [{ type: "text", text }],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  )
}

describe("classifyTone", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key"
    global.fetch = vi.fn()
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey
  })

  it("maps an accusatory response to modifier +30", async () => {
    mockAnthropicResponse("accusatory")

    await expect(classifyTone("Your child refuses to listen.")).resolves.toEqual({
      toneClass: "accusatory",
      toneModifier: 30,
    })
  })

  it("maps a collaborative response to modifier -20", async () => {
    mockAnthropicResponse("collaborative")

    await expect(classifyTone("I wanted to reach out so we can work together.")).resolves.toEqual({
      toneClass: "collaborative",
      toneModifier: -20,
    })
  })

  it("defaults unexpected API output to clinical with modifier +5", async () => {
    mockAnthropicResponse("supportive")

    await expect(classifyTone("Here is the message.")).resolves.toEqual({
      toneClass: "clinical",
      toneModifier: 5,
    })
  })

  it("falls back to clinical when Anthropic returns a 400 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Bad Request" } }), {
        status: 400,
        statusText: "Bad Request",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    )

    await expect(classifyTone("Your child refuses to listen.")).resolves.toEqual({
      toneClass: "clinical",
      toneModifier: 5,
    })
  })

  it("falls back to clinical when the Anthropic request throws", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"))

    await expect(classifyTone("Your child refuses to listen.")).resolves.toEqual({
      toneClass: "clinical",
      toneModifier: 5,
    })
  })
})
