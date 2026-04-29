import type { VisionOcrParagraph, VisionOcrResult } from "./ocr"

export interface ForegroundOcrFilterResult {
  text: string
  paragraphs: VisionOcrParagraph[]
  removed: {
    lowConfidence: number
    repeated: number
    detached: number
  }
}

const MIN_PARAGRAPH_CONFIDENCE = 0.45
const MAX_DETACHED_CENTER_OFFSET = 0.32
const MIN_MAINLINE_CHARS = 40
const MAX_DETACHED_PARAGRAPH_CHARS = 42
const MIN_REPEATED_KEY_LENGTH = 6

function normalizeParagraphKey(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function joinParagraphs(paragraphs: VisionOcrParagraph[]) {
  return paragraphs.map((paragraph) => paragraph.text.trim()).filter(Boolean).join("\n\n").trim()
}

function getMainContentCenterX(paragraphs: VisionOcrParagraph[]) {
  const mainline = paragraphs.filter((paragraph) => paragraph.text.length >= MIN_MAINLINE_CHARS)
  const target = mainline.length > 0 ? mainline : paragraphs
  const weightedCenters = target.flatMap((paragraph) =>
    Array.from({ length: Math.max(1, Math.ceil(paragraph.text.length / 12)) }, () => paragraph.boundingBox.centerX),
  )
  return average(weightedCenters)
}

function shouldDropDetachedParagraph(
  paragraph: VisionOcrParagraph,
  mainContentCenterX: number,
  hasMultipleParagraphs: boolean,
) {
  if (!hasMultipleParagraphs) {
    return false
  }
  if (paragraph.text.length > MAX_DETACHED_PARAGRAPH_CHARS) {
    return false
  }
  if (paragraph.boundingBox.width > 0.3) {
    return false
  }
  return Math.abs(paragraph.boundingBox.centerX - mainContentCenterX) > MAX_DETACHED_CENTER_OFFSET
}

export function filterVisionOcrForeground(result: VisionOcrResult): ForegroundOcrFilterResult {
  const rawText = result.text.trim()
  if (!rawText || result.paragraphs.length === 0) {
    return {
      text: rawText,
      paragraphs: result.paragraphs,
      removed: {
        lowConfidence: 0,
        repeated: 0,
        detached: 0,
      },
    }
  }

  const repeatedKeys = new Map<string, number>()
  for (const paragraph of result.paragraphs) {
    const key = normalizeParagraphKey(paragraph.text)
    if (key.length < MIN_REPEATED_KEY_LENGTH) {
      continue
    }
    repeatedKeys.set(key, (repeatedKeys.get(key) ?? 0) + 1)
  }

  const mainContentCenterX = getMainContentCenterX(result.paragraphs)
  const filteredParagraphs: VisionOcrParagraph[] = []
  const removed = {
    lowConfidence: 0,
    repeated: 0,
    detached: 0,
  }

  for (const paragraph of result.paragraphs) {
    const normalizedKey = normalizeParagraphKey(paragraph.text)
    const repeatCount = repeatedKeys.get(normalizedKey) ?? 0

    if (typeof paragraph.confidence === "number" && paragraph.confidence < MIN_PARAGRAPH_CONFIDENCE) {
      removed.lowConfidence += 1
      continue
    }

    if (repeatCount >= 2) {
      removed.repeated += 1
      continue
    }

    if (
      shouldDropDetachedParagraph(
        paragraph,
        mainContentCenterX,
        result.paragraphs.length > 1,
      )
    ) {
      removed.detached += 1
      continue
    }

    filteredParagraphs.push(paragraph)
  }

  const filteredText = joinParagraphs(filteredParagraphs)
  return {
    text: filteredText || rawText,
    paragraphs: filteredParagraphs,
    removed,
  }
}
