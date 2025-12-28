import { Document, HeadingLevel, Packer, Paragraph } from "docx"

interface DocxOptions {
  draftText: string
  tone?: string
  mode?: string
}

export async function buildDocxBuffer({ draftText, tone, mode }: DocxOptions) {
  const lines = draftText.split(/\r?\n/).filter(Boolean)
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Zaza Draft Output",
            heading: HeadingLevel.HEADING_2,
          }),
          ...(mode
            ? [
                new Paragraph({
                  text: `Mode: ${mode}`,
                }),
              ]
            : []),
          ...(tone
            ? [
                new Paragraph({
                  text: `Tone: ${tone}`,
                }),
              ]
            : []),
          ...lines.map((line) => new Paragraph(line)),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}
