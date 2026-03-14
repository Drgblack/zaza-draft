import { CLOSING_REGEX, formatDraftText, type DraftStructure } from "./format"

const SUBJECT_LINE_REGEX = /^(?:Subject|Betreff)\s*[:\-–—|]+\s*/i
const GREETING_LINE_REGEX =
  /^(?:Dear|Hi|Hello|Parents|Family|Team|Good (?:morning|afternoon|evening)|Liebe|Guten Tag|Hallo|Sehr geehrte)/i

const SIGNOFF_LINE_REGEX =
  /^(?:Kind|Warm|Best|Many)\s+regards,|^Sincerely,|^Yours sincerely,|^Best wishes,|^With thanks,|^Thanks,|^Mit freundlichen Grüßen,|^Mit freundlichen Gruessen,|^Herzliche Grüße,|^Herzliche Gruesse,/i

function isSubjectParagraph(paragraph: string) {
  return SUBJECT_LINE_REGEX.test(paragraph.trim())
}

function isGreetingParagraph(paragraph: string) {
  return GREETING_LINE_REGEX.test(paragraph.trim())
}

function isSignoffParagraph(paragraph: string) {
  return CLOSING_REGEX.test(paragraph.trim()) || SIGNOFF_LINE_REGEX.test(paragraph.trim())
}

function looksLikeSenderArtifact(paragraph: string) {
  const trimmed = paragraph.trim()
  if (!trimmed || trimmed.length > 80) {
    return false
  }
  if (/[.!?]{2,}/.test(trimmed)) {
    return false
  }
  if (/\b(?:student|learner|class|lesson|progress|focus|participation|behaviour|behavior|effort|work|reading|math|mathematik|unterricht|lernt|arbeitet)\b/i.test(trimmed)) {
    return false
  }
  return /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß'.\- ]+$/u.test(trimmed)
}

function trimLeadingArtifacts(paragraphs: string[]) {
  const result = [...paragraphs]
  while (result.length) {
    const first = result[0]?.trim() ?? ""
    if (!first) {
      result.shift()
      continue
    }
    if (isSubjectParagraph(first) || isGreetingParagraph(first)) {
      result.shift()
      continue
    }
    break
  }
  return result
}

function trimTrailingArtifacts(paragraphs: string[]) {
  const result = [...paragraphs]
  while (result.length) {
    const last = result[result.length - 1]?.trim() ?? ""
    if (!last) {
      result.pop()
      continue
    }
    if (isSignoffParagraph(last)) {
      result.pop()
      continue
    }
    if (looksLikeSenderArtifact(last) && result.length > 1) {
      const previous = result[result.length - 2]?.trim() ?? ""
      if (!previous || isSignoffParagraph(previous)) {
        result.pop()
        continue
      }
    }
    break
  }
  return result
}

export function sanitizeReportCommentText(text: string | undefined | null) {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trim()
  if (!normalized) {
    return ""
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const withoutLeadingArtifacts = trimLeadingArtifacts(paragraphs)
  const withoutTrailingArtifacts = trimTrailingArtifacts(withoutLeadingArtifacts)

  return withoutTrailingArtifacts.join("\n\n").trim()
}

export function sanitizeReportCommentStructure(structure: DraftStructure, locale?: string): DraftStructure {
  const raw = [
    structure.subject ? `Subject: ${structure.subject}` : "",
    ...(structure.paragraphs ?? []),
  ]
    .filter(Boolean)
    .join("\n\n")

  const sanitizedText = sanitizeReportCommentText(raw)
  if (!sanitizedText) {
    return { paragraphs: [] }
  }

  const sanitizedStructure = formatDraftText(sanitizedText, locale)
  return {
    subject: undefined,
    paragraphs: sanitizedStructure.paragraphs.filter(Boolean),
  }
}
