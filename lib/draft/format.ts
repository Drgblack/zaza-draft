export interface DraftStructure {
  subject?: string
  paragraphs: string[]
}

const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/

function splitIntoParagraphs(body: string): string[] {
  const normalizedBody = body.replace(/\r\n/g, "\n").trim()
  if (!normalizedBody) {
    return []
  }

  const paragraphs = normalizedBody
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs
  }

  if (paragraphs.length === 1) {
    const sentences = paragraphs[0].split(SENTENCE_SPLIT_REGEX).map((sentence) => sentence.trim()).filter(Boolean)
    if (sentences.length > 2) {
      const regrouped: string[] = []
      for (let idx = 0; idx < sentences.length; idx += 2) {
        const slice = sentences.slice(idx, idx + 2).join(" ").trim()
        if (slice) {
          regrouped.push(slice)
        }
      }
      return regrouped.length ? regrouped : paragraphs
    }
  }

  return paragraphs
}

export function formatDraftText(text: string): DraftStructure {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return { paragraphs: [] }
  }

  const lines = normalized.split("\n")
  let subject: string | undefined
  let bodyStartIndex = 0
  const subjectLineMatch = lines[0]?.match(/^\s*Subject\s*[:\-]\s*(.+)$/i)
  if (subjectLineMatch) {
    subject = subjectLineMatch[1].trim()
    bodyStartIndex = 1
    while (lines[bodyStartIndex] === "") {
      bodyStartIndex += 1
    }
  }

  const bodyLines = lines.slice(bodyStartIndex).join("\n")
  const paragraphs = splitIntoParagraphs(bodyLines)

  return {
    subject,
    paragraphs,
  }
}
