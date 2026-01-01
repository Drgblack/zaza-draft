export interface DraftStructure {
  subject?: string
  paragraphs: string[]
}

const GREETING_REGEX = /^\s*(Dear|Hi|Hello|Parents|Family|Team|Good (?:morning|afternoon|evening))\b/i
const CLOSING_REGEX =
  /\b(?:Kind|Warm|Best|Many)\s+regards,|Sincerely,|Yours sincerely,|Best wishes,|With thanks,|Thanks,/i
const SUBJECT_REGEX =
  /^\s*Subject\s*[:\-]\s*(.+?)(?=(?:\n|Dear\b|Hi\b|Hello\b|Parents\b|Family\b|Team\b|Good\b|$))/i

function chunkSentences(sentences: string[], targetParagraphs: number) {
  const chunks: string[] = []
  if (!sentences.length) {
    return chunks
  }
  const chunkSize = Math.max(1, Math.ceil(sentences.length / targetParagraphs))
  for (let start = 0; start < sentences.length; start += chunkSize) {
    const chunk = sentences.slice(start, start + chunkSize).join(" ").trim()
    if (chunk) {
      chunks.push(chunk)
    }
  }
  return chunks
}

function buildParagraphs(body: string): string[] {
  const trimmedBody = body.replace(/\r\n/g, "\n").trim()
  if (!trimmedBody) {
    return []
  }

  const newlineParagraphs = trimmedBody
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (newlineParagraphs.length > 1) {
    return newlineParagraphs.flatMap((paragraph) => {
      const closingMatch = paragraph.match(CLOSING_REGEX)
      if (closingMatch && !CLOSING_REGEX.test(paragraph.trimEnd())) {
        const index = paragraph.search(CLOSING_REGEX)
        if (index > 0) {
          return [paragraph.slice(0, index).trim(), paragraph.slice(index).trim()]
        }
      }
      return [paragraph]
    }).filter(Boolean)
  }

  const sentences = trimmedBody
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const paragraphs: string[] = []
  if (!sentences.length) {
    return paragraphs
  }

  if (GREETING_REGEX.test(sentences[0])) {
    paragraphs.push(sentences.shift()!)
  }

  let closingParagraph: string | null = null
  const closingIndex = sentences.findIndex((sentence) => CLOSING_REGEX.test(sentence))
  if (closingIndex >= 0) {
    closingParagraph = sentences.slice(closingIndex).join(" ").trim()
    sentences.splice(closingIndex)
  }

  if (sentences.length) {
    const targetParagraphs = Math.min(4, Math.max(1, Math.ceil(sentences.length / 2)))
    paragraphs.push(...chunkSentences(sentences, targetParagraphs))
  }

  if (closingParagraph) {
    paragraphs.push(closingParagraph)
  }

  return paragraphs
}

export function formatDraftText(text: string): DraftStructure {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return { paragraphs: [] }
  }

  let subject: string | undefined
  let bodyText = normalized

  const subjectMatch = normalized.match(SUBJECT_REGEX)
  if (subjectMatch) {
    let subjectContent = subjectMatch[1].trim()
    const greetingIndex = subjectContent.search(GREETING_REGEX)
    if (greetingIndex >= 0) {
      const greetingPortion = subjectContent.slice(greetingIndex).trim()
      subjectContent = subjectContent.slice(0, greetingIndex).trim()
      bodyText = `${greetingPortion}\n${normalized.slice(subjectMatch[0].length)}`.trim()
    } else {
      bodyText = normalized.slice(subjectMatch[0].length).trim()
    }
    subject = subjectContent || undefined
  }

  const paragraphs = buildParagraphs(bodyText)
  return {
    subject,
    paragraphs,
  }
}
