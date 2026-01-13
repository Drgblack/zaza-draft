const SUBJECT_REGEX =
  /^\s*(?:Subject|Betreff)\s*[:\-]\s*(.+?)(?=(?:\n|Dear\b|Hi\b|Hello\b|Parents\b|Family\b|Team\b|Good\b|Liebe\b|Liebe Eltern\b|Liebe Erziehungsberechtigte\b|$))/im
const GREETING_REGEX = /(Liebe(?:r)? (?:Eltern|Erziehungsberechtigte)[^,\n]*,)/i
const CLOSING_REGEX = /(Freundliche Gr≪e|Herzliche Gr≪e|Mit freundlichen Gr≪en)[\s\S]*$/im

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

function buildParagraphs(body: string) {
  const trimmedBody = body.replace(/\r\n/g, "\n").trim()
  if (!trimmedBody) {
    return []
  }

  const explicitParagraphs = trimmedBody
    .split(/\n\s*\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (explicitParagraphs.length >= 2) {
    return explicitParagraphs.slice(0, 4)
  }

  const sentences = trimmedBody
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 1) {
    return [trimmedBody]
  }

  const targetParagraphs = Math.min(4, Math.max(2, Math.ceil(sentences.length / 2)))
  return chunkSentences(sentences, targetParagraphs)
}

function ensureTrailingComma(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.endsWith(",")) {
    return trimmed
  }
  return `${trimmed},`
}

function neutralizeJudgementalTerms(text: string) {
  let result = text
  let replaced = false

  const replacements: Array<[RegExp, string]> = [
    [/\bAusreden\b/gi, "Herausforderungen"],
    [/\bL“en\b/gi, "abweichende Informationen"],
    [/\bfaul\b/gi, "nicht konsequent genug"],
  ]

  replacements.forEach(([pattern, replacement]) => {
    const updated = result.replace(pattern, replacement)
    if (updated !== result) {
      replaced = true
      result = updated
    }
  })

  return { text: result, replaced }
}

export interface NormalizedGermanMessage {
  text: string
  neutralized: boolean
}

export function normalizeGermanParentMessage(text: string): NormalizedGermanMessage {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  const subjectMatch = normalized.match(SUBJECT_REGEX)
  const bodyWithoutSubject = normalized.replace(SUBJECT_REGEX, "").trim()
  const cleanedBody = bodyWithoutSubject.replace(new RegExp(SUBJECT_REGEX, "gi"), "").trim()

  const subjectContent = subjectMatch?.[1]?.trim()
  const subjectLine = subjectContent ? `Betreff: ${subjectContent}` : "Betreff: R…kmeldung"

  let body = cleanedBody

  let closingSegment = ""
  const closingMatch = body.match(CLOSING_REGEX)
  if (closingMatch && typeof closingMatch.index === "number") {
    closingSegment = closingMatch[0].trim()
    body = body.slice(0, closingMatch.index).trim()
  }

  body = body.replace(GREETING_REGEX, (match) => `\n\n${match.trim()}\n\n`)

  let closingLine = ""
  let teacherLine = ""
  if (closingSegment) {
    const lines = closingSegment
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length > 1) {
      closingLine = ensureTrailingComma(lines[0])
      teacherLine = lines.slice(1).join(" ").trim()
    } else if (closingSegment.includes(",")) {
      const [closingRaw, ...rest] = closingSegment.split(",")
      closingLine = ensureTrailingComma(closingRaw)
      teacherLine = rest.join(",").trim()
    } else if (lines.length) {
      closingLine = ensureTrailingComma(lines[0])
    }
  }

  const paragraphs = buildParagraphs(body)
  const messageBody = paragraphs.join("\n\n").trim()

  let result = `${subjectLine}`
  if (messageBody) {
    result += `\n\n${messageBody}`
  }
  if (closingLine) {
    result += `\n\n${closingLine}`
  }
  if (teacherLine) {
    result += `\n${teacherLine}`
  }

  const collapsed = result.replace(/\n{3,}/g, "\n\n").trim()
  const neutralized = neutralizeJudgementalTerms(collapsed)
  return {
    text: neutralized.text,
    neutralized: neutralized.replaced,
  }
}
