import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import { getExportSubjectLabel, resolveExportLayout } from "@/lib/export/layout"

interface DocxOptions {
  draftText: string
  language?: string
  tone?: string
  mode?: string
}

const BODY_FONT_SIZE = 24
const FOOTER_FONT_SIZE = 18
const PAGE_MARGINS = {
  top: 1440,
  right: 1080,
  bottom: 1440,
  left: 1080,
  header: 540,
  footer: 720,
  gutter: 0,
} as const

function createFooter() {
  return new Footer({
    children: [
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: {
                  size: 50,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: "zazadraft.com",
                        size: FOOTER_FONT_SIZE,
                        color: "808080",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: {
                  size: 50,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: "Zaza — Just Teach",
                        size: FOOTER_FONT_SIZE,
                        color: "808080",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

export async function buildDocxBuffer({ draftText, language, mode }: DocxOptions) {
  const layout = resolveExportLayout({
    draftText,
    language,
    mode,
  })

  const children: Paragraph[] = []

  if (layout.subject) {
    children.push(
      new Paragraph({
        spacing: {
          before: 0,
          after: 240,
        },
        children: [
          new TextRun({
            text: `${getExportSubjectLabel(layout.locale)}: ${layout.subject}`,
            bold: true,
            size: BODY_FONT_SIZE,
          }),
        ],
      }),
    )
  }

  for (const paragraph of layout.paragraphs) {
    children.push(
      new Paragraph({
        spacing: {
          before: 0,
          after: 220,
          line: 360,
        },
        children: [
          new TextRun({
            text: paragraph,
            size: BODY_FONT_SIZE,
          }),
        ],
      }),
    )
  }

  if (layout.closingLines.length) {
    children.push(
      new Paragraph({
        spacing: {
          before: 280,
          after: 0,
          line: 340,
        },
        children: layout.closingLines.map(
          (line, index) =>
            new TextRun({
              text: line,
              size: BODY_FONT_SIZE,
              break: index === 0 ? 0 : 1,
            }),
        ),
      }),
    )
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: PAGE_MARGINS,
          },
        },
        footers: {
          default: createFooter(),
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
