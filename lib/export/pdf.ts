import fs from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib"
import { getExportSubjectLabel, resolveExportLayout } from "@/lib/export/layout"

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const LEFT_MARGIN = 64
const RIGHT_MARGIN = 64
const TOP_MARGIN = 72
const BOTTOM_MARGIN = 68
const HEADER_HEIGHT = 52
const FOOTER_GAP = 28
const BODY_FONT_SIZE = 11.5
const BODY_LINE_HEIGHT = 17
const PARAGRAPH_SPACING = 16
const SUBJECT_FONT_SIZE = 14
const SUBJECT_LINE_HEIGHT = 20
const SUBJECT_SPACING = 22
const CLOSING_SPACING = 20
const FOOTER_FONT_SIZE = 9
const FOOTER_LINE_Y = 34
const FOOTER_TEXT_Y = 20
const CONTENT_WIDTH = A4_WIDTH - LEFT_MARGIN - RIGHT_MARGIN
const FOOTER_COLOR = rgb(0.51, 0.51, 0.51)
const BODY_COLOR = rgb(0.16, 0.19, 0.22)
const SUBJECT_COLOR = rgb(0.1, 0.14, 0.2)
const BRAND_COLOR = rgb(0.11, 0.36, 0.53)
const RULE_COLOR = rgb(0.86, 0.88, 0.91)

interface PdfOptions {
  draftText: string
  language?: string
  mode?: string
}

interface RenderContext {
  page: PDFPage
  y: number
}

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

async function loadLogo(pdfDoc: PDFDocument) {
  const logoPath = path.join(process.cwd(), "public", "z-logo.png")
  try {
    const bytes = await fs.readFile(logoPath)

    if (bytes.length < 8) {
      return null
    }

    const hasPngSignature =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a

    if (!hasPngSignature) {
      return null
    }

    try {
      return await pdfDoc.embedPng(bytes)
    } catch {
      return null
    }
  } catch {
    return null
  }
}

function drawFooter(page: PDFPage, regularFont: PDFFont, boldFont: PDFFont) {
  page.drawLine({
    start: { x: LEFT_MARGIN, y: FOOTER_LINE_Y },
    end: { x: A4_WIDTH - RIGHT_MARGIN, y: FOOTER_LINE_Y },
    thickness: 0.6,
    color: RULE_COLOR,
  })

  const leftText = "zazadraft.com"
  const rightText = "Zaza — Just Teach"
  page.drawText(leftText, {
    x: LEFT_MARGIN,
    y: FOOTER_TEXT_Y,
    size: FOOTER_FONT_SIZE,
    font: regularFont,
    color: FOOTER_COLOR,
  })

  const rightWidth = boldFont.widthOfTextAtSize(rightText, FOOTER_FONT_SIZE)
  page.drawText(rightText, {
    x: A4_WIDTH - RIGHT_MARGIN - rightWidth,
    y: FOOTER_TEXT_Y,
    size: FOOTER_FONT_SIZE,
    font: boldFont,
    color: FOOTER_COLOR,
  })
}

function drawHeader(page: PDFPage, regularFont: PDFFont, boldFont: PDFFont, logo: PDFImage | null) {
  const headerBottomY = A4_HEIGHT - TOP_MARGIN - HEADER_HEIGHT
  let brandTextX = LEFT_MARGIN

  if (logo) {
    const scaled = logo.scale(0.12)
    const logoHeight = 26
    const logoWidth = (scaled.width / scaled.height) * logoHeight
    page.drawImage(logo, {
      x: LEFT_MARGIN,
      y: headerBottomY + 14,
      width: logoWidth,
      height: logoHeight,
    })
    brandTextX += logoWidth + 10
  }

  page.drawText("Zaza Draft", {
    x: brandTextX,
    y: headerBottomY + 22,
    size: 14,
    font: boldFont,
    color: BRAND_COLOR,
  })
  page.drawText("Professional export", {
    x: brandTextX,
    y: headerBottomY + 8,
    size: 9.5,
    font: regularFont,
    color: FOOTER_COLOR,
  })
  page.drawLine({
    start: { x: LEFT_MARGIN, y: headerBottomY },
    end: { x: A4_WIDTH - RIGHT_MARGIN, y: headerBottomY },
    thickness: 0.8,
    color: RULE_COLOR,
  })
}

function getPageStartY() {
  return A4_HEIGHT - TOP_MARGIN - HEADER_HEIGHT - 24
}

function getMinimumContentY() {
  return BOTTOM_MARGIN + FOOTER_GAP
}

function drawWrappedParagraph(
  page: PDFPage,
  text: string,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
  startY: number,
  color = BODY_COLOR,
) {
  const measure = (value: string) => font.widthOfTextAtSize(value, fontSize)
  const lines = wrapLine(text, CONTENT_WIDTH, measure)
  let y = startY

  for (const line of lines) {
    page.drawText(line, {
      x: LEFT_MARGIN,
      y,
      size: fontSize,
      font,
      color,
    })
    y -= lineHeight
  }

  return {
    y,
    height: lines.length * lineHeight,
  }
}

export async function buildPdfBuffer({ draftText, language, mode }: PdfOptions): Promise<Buffer> {
  const layout = resolveExportLayout({
    draftText,
    language,
    mode,
  })

  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const logo = await loadLogo(pdfDoc)

  const createPage = () => {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
    drawHeader(page, regularFont, boldFont, logo)
    drawFooter(page, regularFont, boldFont)
    return {
      page,
      y: getPageStartY(),
    }
  }

  let context = createPage()

  const ensureSpace = (requiredHeight: number) => {
    if (context.y - requiredHeight >= getMinimumContentY()) {
      return
    }
    context = createPage()
  }

  if (layout.subject) {
    ensureSpace(SUBJECT_LINE_HEIGHT + SUBJECT_SPACING)
    const subjectText = `${getExportSubjectLabel(layout.locale)}: ${layout.subject}`
    const rendered = drawWrappedParagraph(
      context.page,
      subjectText,
      boldFont,
      SUBJECT_FONT_SIZE,
      SUBJECT_LINE_HEIGHT,
      context.y,
      SUBJECT_COLOR,
    )
    context.y = rendered.y - SUBJECT_SPACING
  }

  for (const paragraph of layout.paragraphs) {
    const measure = (value: string) => regularFont.widthOfTextAtSize(value, BODY_FONT_SIZE)
    const lineCount = wrapLine(paragraph, CONTENT_WIDTH, measure).length
    ensureSpace(lineCount * BODY_LINE_HEIGHT + PARAGRAPH_SPACING)
    const rendered = drawWrappedParagraph(
      context.page,
      paragraph,
      regularFont,
      BODY_FONT_SIZE,
      BODY_LINE_HEIGHT,
      context.y,
    )
    context.y = rendered.y - PARAGRAPH_SPACING
  }

  if (layout.closingLines.length) {
    const closingLineCount = layout.closingLines.reduce((total, line) => {
      const measure = (value: string) => regularFont.widthOfTextAtSize(value, BODY_FONT_SIZE)
      return total + wrapLine(line, CONTENT_WIDTH, measure).length
    }, 0)
    ensureSpace(CLOSING_SPACING + closingLineCount * BODY_LINE_HEIGHT)
    context.y -= CLOSING_SPACING

    for (const line of layout.closingLines) {
      const rendered = drawWrappedParagraph(
        context.page,
        line,
        regularFont,
        BODY_FONT_SIZE,
        BODY_LINE_HEIGHT,
        context.y,
      )
      context.y = rendered.y
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
