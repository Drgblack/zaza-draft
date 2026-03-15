import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  Paragraph,
  PositionalTab,
  PositionalTabAlignment,
  PositionalTabLeader,
  PositionalTabRelativeTo,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx"
import fs from "node:fs/promises"
import path from "node:path"
import { getExportSubjectLabel, resolveExportLayout } from "@/lib/export/layout"

interface DocxOptions {
  draftText: string
  language?: string
  tone?: string
  mode?: string
}

const BODY_FONT_SIZE = 24
const FOOTER_FONT_SIZE = 18
const BRAND_PURPLE = "8B5CF6"
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
      new Paragraph({
        spacing: { before: 0, after: 0 },
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
          },
        ],
        children: [
          new TextRun({
            text: "zazadraft.com",
            size: FOOTER_FONT_SIZE,
            color: "808080",
          }),
          new TextRun({
            children: [
              new PositionalTab({
                alignment: PositionalTabAlignment.RIGHT,
                relativeTo: PositionalTabRelativeTo.MARGIN,
                leader: PositionalTabLeader.NONE,
              }),
            ],
          }),
          new TextRun({
            text: "Zaza — Just Teach",
            size: FOOTER_FONT_SIZE,
            color: "808080",
          }),
        ],
      }),
    ],
  })
}

async function createBrandBlock() {
  const logoPath = path.join(process.cwd(), "public", "z-logo.png")
  const logoData = await fs.readFile(logoPath)

  return [
    new Paragraph({
      spacing: {
        before: 0,
        after: 40,
      },
      children: [
        new ImageRun({
          data: logoData,
          type: "png",
          transformation: {
            width: 40,
            height: 40,
          },
        }),
        new TextRun({
          text: "  Zaza Draft",
          bold: true,
          color: BRAND_PURPLE,
          size: 30,
        }),
      ],
    }),
    new Paragraph({
      spacing: {
        before: 0,
        after: 160,
      },
      children: [
        new TextRun({
          text: "Professional export",
          size: 19,
          color: "808080",
        }),
      ],
    }),
    new Paragraph({
      spacing: {
        before: 0,
        after: 220,
      },
      border: {
        bottom: {
          color: "D5D9E1",
          size: 6,
          style: BorderStyle.SINGLE,
        },
      },
      children: [],
    }),
  ]
}

export async function buildDocxBuffer({ draftText, language, mode }: DocxOptions) {
  const layout = resolveExportLayout({
    draftText,
    language,
    mode,
  })

  const children: Paragraph[] = await createBrandBlock()

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
