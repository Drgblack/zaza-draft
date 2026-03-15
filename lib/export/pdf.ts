import { PDFDocument, StandardFonts } from "pdf-lib"

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const PAGE_MARGIN = 48
const FONT_SIZE = 12
const LINE_HEIGHT = 16

function wrapLine(text: string, maxWidth: number, measure: (value: string) => number) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return [""]
  }

  const lines: string[] = []
  let currentLine = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`
    if (measure(candidate) <= maxWidth) {
      currentLine = candidate
      continue
    }
    lines.push(currentLine)
    currentLine = words[index]
  }

  lines.push(currentLine)
  return lines
}

export async function buildPdfBuffer(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2
  const measure = (value: string) => font.widthOfTextAtSize(value, FONT_SIZE)

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
  let y = A4_HEIGHT - PAGE_MARGIN

  const ensureSpace = () => {
    if (y >= PAGE_MARGIN) {
      return
    }
    page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
    y = A4_HEIGHT - PAGE_MARGIN
  }

  const drawLine = (line: string) => {
    ensureSpace()
    page.drawText(line, {
      x: PAGE_MARGIN,
      y,
      size: FONT_SIZE,
      font,
    })
    y -= LINE_HEIGHT
  }

  const paragraphs = text.split(/\r?\n/)
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      y -= LINE_HEIGHT
      ensureSpace()
      continue
    }

    const wrappedLines = wrapLine(paragraph, maxWidth, measure)
    for (const line of wrappedLines) {
      drawLine(line)
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
