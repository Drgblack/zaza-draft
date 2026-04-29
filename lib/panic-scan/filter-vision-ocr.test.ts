import { describe, expect, it } from "vitest"

import { filterVisionOcrForeground } from "./filter-vision-ocr"
import type { VisionOcrResult } from "./ocr"

function createParagraph(
  text: string,
  options: {
    confidence?: number | null
    centerX?: number
    width?: number
  } = {},
) {
  return {
    text,
    confidence: options.confidence ?? 0.9,
    boundingBox: {
      left: (options.centerX ?? 0.5) - (options.width ?? 0.4) / 2,
      top: 0.1,
      right: (options.centerX ?? 0.5) + (options.width ?? 0.4) / 2,
      bottom: 0.2,
      width: options.width ?? 0.4,
      height: 0.1,
      centerX: options.centerX ?? 0.5,
      centerY: 0.15,
    },
  }
}

describe("filterVisionOcrForeground", () => {
  it("drops repeated watermark-like paragraphs", () => {
    const result: VisionOcrResult = {
      text: "ZAZA\nParent message body\nZAZA",
      paragraphs: [
        createParagraph("ZAZA watermark", { centerX: 0.1, width: 0.12 }),
        createParagraph(
          "Dear Ms Khan, I am worried about how much homework came home this week.",
        ),
        createParagraph("ZAZA watermark", { centerX: 0.88, width: 0.12 }),
      ],
    }

    const filtered = filterVisionOcrForeground(result)

    expect(filtered.text).toContain("Dear Ms Khan")
    expect(filtered.text).not.toContain("ZAZA watermark")
    expect(filtered.removed.repeated).toBe(2)
  })

  it("drops very low-confidence paragraphs before cleaning", () => {
    const result: VisionOcrResult = {
      text: "header\nmessage body",
      paragraphs: [
        createParagraph("faint background text", { confidence: 0.21 }),
        createParagraph(
          "Please explain what happened in class today and how the plan will be handled tomorrow.",
          { confidence: 0.88 },
        ),
      ],
    }

    const filtered = filterVisionOcrForeground(result)

    expect(filtered.text).toContain("Please explain what happened")
    expect(filtered.text).not.toContain("faint background text")
    expect(filtered.removed.lowConfidence).toBe(1)
  })

  it("drops short detached side text when stronger main content exists", () => {
    const result: VisionOcrResult = {
      text: "side note\nmain body",
      paragraphs: [
        createParagraph("Confidential", { centerX: 0.04, width: 0.08 }),
        createParagraph(
          "Dear team, my child came home upset and I need to understand what support will be put in place tomorrow.",
          { centerX: 0.55, width: 0.56 },
        ),
      ],
    }

    const filtered = filterVisionOcrForeground(result)

    expect(filtered.text).toContain("Dear team")
    expect(filtered.text).not.toContain("Confidential")
    expect(filtered.removed.detached).toBe(1)
  })
})
