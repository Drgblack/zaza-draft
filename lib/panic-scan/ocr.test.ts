import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { performVisionOcr } from "./ocr"

describe("performVisionOcr", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.GOOGLE_VISION_API_KEY = "vision-test-key"
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    delete process.env.GOOGLE_VISION_API_KEY
    vi.unstubAllGlobals()
  })

  it("includes British English language hints for English locales", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        responses: [
          {
            fullTextAnnotation: {
              text: "Hello world",
              pages: [],
            },
          },
        ],
      }),
    })

    await performVisionOcr(Buffer.from("test-image"), "en-GB")

    const request = fetchMock.mock.calls[0]
    const body = JSON.parse(request?.[1]?.body as string)
    expect(body.requests[0].imageContext.languageHints).toEqual(["en-GB", "en"])
  })

  it("includes German language hints for German locales", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        responses: [
          {
            fullTextAnnotation: {
              text: "Hallo Welt",
              pages: [],
            },
          },
        ],
      }),
    })

    await performVisionOcr(Buffer.from("test-image"), "de-DE")

    const request = fetchMock.mock.calls[0]
    const body = JSON.parse(request?.[1]?.body as string)
    expect(body.requests[0].imageContext.languageHints).toEqual(["de", "en"])
  })
})
