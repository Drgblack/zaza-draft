export type DraftLocale = "en-GB" | "de-DE"
export type DraftMode = "parent_message" | "report_comment" | "internal_note" | "general_email"

export type RiskLevel = "low" | "medium" | "high" | "unknown"
export type Urgency = "low" | "medium" | "high" | "unknown"
export type EmotionalIndicator =
  | "distress"
  | "fear"
  | "humiliation"
  | "anger"
  | "threat"
  | "grief"
  | "unknown"

export interface DraftContext {
  requestId: string
  locale: DraftLocale
  mode: DraftMode

  parentName?: string
  childName?: string
  teacherName?: string
  schoolName?: string

  riskLevel?: RiskLevel
  urgency?: Urgency
  emotionalIndicators?: EmotionalIndicator[]

  panicScan?: {
    scanId: string
    cleanedMessage?: string
    ocrConfidence?: number
    summary?: string
    suggestedReplyBullets?: string[]
  }

  subject?: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const cleanValue = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => cleanValue(item))
      .filter((item) => item !== undefined)
    return cleaned.length ? cleaned : undefined
  }
  if (isPlainObject(value)) {
    const nested = stripUndefined(value)
    return Object.keys(nested).length ? nested : undefined
  }
  return value
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item === undefined ? undefined : cleanValue(item)))
      .filter((item) => item !== undefined) as T
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      const normalized = cleanValue(val)
      if (normalized !== undefined) {
        cleaned[key] = normalized
      }
    }
    return cleaned as T
  }
  return value
}
