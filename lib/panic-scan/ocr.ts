const API_URL = "https://vision.googleapis.com/v1/images:annotate"

type VisionApiVertex = {
  x?: number
  y?: number
}

type VisionApiParagraph = {
  confidence?: number
  boundingBox?: {
    vertices?: VisionApiVertex[]
  }
  words?: Array<{
    symbols?: Array<{
      text?: string
      property?: {
        detectedBreak?: {
          type?: string
        }
      }
    }>
  }>
}

export type VisionOcrBoundingBox = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export type VisionOcrParagraph = {
  text: string
  confidence: number | null
  boundingBox: VisionOcrBoundingBox
}

export type VisionOcrResult = {
  text: string
  paragraphs: VisionOcrParagraph[]
}

function getApiKey() {
  return process.env.GOOGLE_VISION_API_KEY
}

export async function performVisionOcr(imageBuffer: Buffer) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("Missing Google Vision API key (GOOGLE_VISION_API_KEY)")
  }

  const payload = {
    requests: [
      {
        image: {
          content: imageBuffer.toString("base64"),
        },
        features: [
          {
            type: "DOCUMENT_TEXT_DETECTION",
          },
        ],
      },
    ],
  }

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("OCR request failed")
  }

  const data = await response.json()
  const fullTextAnnotation = data?.responses?.[0]?.fullTextAnnotation
  const text = fullTextAnnotation?.text
  if (!text) {
    throw new Error("OCR returned no text")
  }

  return {
    text: text.trim(),
    paragraphs: extractParagraphs(fullTextAnnotation),
  }
}

function extractParagraphs(fullTextAnnotation: {
  pages?: Array<{
    width?: number
    height?: number
    blocks?: Array<{
      paragraphs?: VisionApiParagraph[]
    }>
  }>
}) {
  const paragraphs: VisionOcrParagraph[] = []
  const pages = fullTextAnnotation?.pages ?? []

  for (const page of pages) {
    const pageWidth = page.width ?? 1
    const pageHeight = page.height ?? 1

    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        const paragraphText = buildParagraphText(paragraph)
        if (!paragraphText) {
          continue
        }

        paragraphs.push({
          text: paragraphText,
          confidence:
            typeof paragraph.confidence === "number" ? paragraph.confidence : null,
          boundingBox: normalizeBoundingBox(paragraph.boundingBox?.vertices ?? [], pageWidth, pageHeight),
        })
      }
    }
  }

  return paragraphs
}

function buildParagraphText(paragraph: VisionApiParagraph) {
  const tokens: string[] = []

  for (const word of paragraph.words ?? []) {
    let wordText = ""
    let shouldAppendSpace = true

    for (const symbol of word.symbols ?? []) {
      wordText += symbol.text ?? ""
      const breakType = symbol.property?.detectedBreak?.type
      if (breakType === "LINE_BREAK" || breakType === "EOL_SURE_SPACE") {
        shouldAppendSpace = true
      }
    }

    const trimmedWord = wordText.trim()
    if (!trimmedWord) {
      continue
    }

    tokens.push(trimmedWord)
    if (!shouldAppendSpace) {
      tokens.push("")
    }
  }

  return tokens.join(" ").replace(/\s+([,.;!?])/g, "$1").replace(/\s+/g, " ").trim()
}

function normalizeBoundingBox(vertices: VisionApiVertex[], pageWidth: number, pageHeight: number) {
  const normalizedVertices = vertices
    .map((vertex) => ({
      x: Math.max(0, Math.min(1, (vertex.x ?? 0) / pageWidth)),
      y: Math.max(0, Math.min(1, (vertex.y ?? 0) / pageHeight)),
    }))
    .filter((vertex) => Number.isFinite(vertex.x) && Number.isFinite(vertex.y))

  if (normalizedVertices.length === 0) {
    return {
      left: 0,
      top: 0,
      right: 1,
      bottom: 1,
      width: 1,
      height: 1,
      centerX: 0.5,
      centerY: 0.5,
    }
  }

  const xValues = normalizedVertices.map((vertex) => vertex.x)
  const yValues = normalizedVertices.map((vertex) => vertex.y)
  const left = Math.min(...xValues)
  const right = Math.max(...xValues)
  const top = Math.min(...yValues)
  const bottom = Math.max(...yValues)

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  }
}
